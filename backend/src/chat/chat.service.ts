import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FriendsService } from 'src/friends/friends.service';
import { WebsocketGateway } from 'src/websocket/websocket.gateway';
import { CreateMessageDto } from './dto/create-message.dto';

const USER_SELECT = {
  id: true,
  username: true,
  fullname: true,
  avatarUrl: true,
} as const;

const MESSAGE_ARTWORK = {
  select: {
    id: true,
    title: true,
    mediaUrl: true,
    author: { select: { id: true, username: true, fullname: true } },
  },
} as const;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendsService,
    private readonly gateway: WebsocketGateway,
  ) {}

  async getConversations(userId: string) {
    const convos = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: { include: { user: { select: USER_SELECT } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return Promise.all(convos.map((c) => this.toSummary(userId, c)));
  }

  async openConversation(userId: string, otherUserId: string) {
    if (otherUserId === userId) {
      throw new BadRequestException("You can't message yourself");
    }
    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
    });
    if (!other) {
      throw new NotFoundException('User not found');
    }
    if (!(await this.friends.areMutuals(userId, otherUserId))) {
      throw new ForbiddenException('You must follow each other to chat');
    }
    const pairKey = [userId, otherUserId].sort().join(':');
    let convo = await this.prisma.conversation.findUnique({ where: { pairKey } });
    if (!convo) {
      convo = await this.prisma.conversation.create({
        data: {
          pairKey,
          participants: { create: [{ userId }, { userId: otherUserId }] },
        },
      });
    }
    const full = await this.prisma.conversation.findUnique({
      where: { id: convo.id },
      include: {
        participants: { include: { user: { select: USER_SELECT } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return this.toSummary(userId, full!);
  }

  async getMessages(userId: string, conversationId: string, page = 1, limit = 30) {
    await this.assertParticipant(userId, conversationId);
    const take = limit + 1;
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take,
      include: { artwork: MESSAGE_ARTWORK },
    });
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((m) =>
      this.toMessage(m),
    );
    return { items, page, hasMore };
  }

  async sendMessage(userId: string, conversationId: string, dto: CreateMessageDto) {
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!convo) {
      throw new NotFoundException('Conversation not found');
    }
    if (!convo.participants.some((p) => p.userId === userId)) {
      throw new ForbiddenException('Not a participant');
    }
    const other = convo.participants.find((p) => p.userId !== userId);
    if (other && !(await this.friends.areMutuals(userId, other.userId))) {
      // 2xx result (not 403) so the browser logs no network error.
      return { ok: false as const, reason: 'not_mutual' };
    }
    if (!dto.content && !dto.artworkId) {
      throw new BadRequestException('A message needs text or an artwork');
    }
    if (dto.artworkId) {
      const art = await this.prisma.artwork.findUnique({
        where: { id: dto.artworkId },
      });
      if (!art) {
        throw new NotFoundException('Artwork not found');
      }
    }
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content ?? null,
        artworkId: dto.artworkId ?? null,
      },
      include: { artwork: MESSAGE_ARTWORK },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    const payload = this.toMessage(message);
    convo.participants.forEach((p) =>
      this.gateway.emitToUser(p.userId, 'message:new', {
        conversationId,
        message: payload,
      }),
    );
    return payload;
  }

  /**
   * Ouvre la conversation d'une paire devenue mutuelle et y pose le marqueur
   * d'amitié. Appelé par FollowService, jamais par un contrôleur — d'où
   * l'absence de garde de participation : la mutualité a déjà été vérifiée.
   *
   * Le texte n'est pas stocké : on persiste `systemKey`, le frontend rend
   * t('chat.system.<key>'). Sinon le message resterait figé dans la langue
   * de création, alors que l'app tient trois locales en parité.
   */
  async createMutualFollowMarker(a: string, b: string): Promise<void> {
    const pairKey = [a, b].sort().join(':');
    let convo = await this.prisma.conversation.findUnique({ where: { pairKey } });
    if (!convo) {
      convo = await this.prisma.conversation.create({
        data: {
          pairKey,
          participants: { create: [{ userId: a }, { userId: b }] },
        },
      });
    }

    // Garde anti-toggle : un follow/unfollow répété ne doit pas empiler les
    // marqueurs. Une remutualisation APRÈS un vrai échange en repose un.
    const last = await this.prisma.message.findFirst({
      where: { conversationId: convo.id },
      orderBy: { createdAt: 'desc' },
      select: { kind: true, systemKey: true },
    });
    if (last?.kind === 'SYSTEM' && last.systemKey === 'mutualFollow') {
      return;
    }

    const created = await this.prisma.message.create({
      data: {
        conversationId: convo.id,
        kind: 'SYSTEM',
        systemKey: 'mutualFollow',
      },
      include: { artwork: MESSAGE_ARTWORK },
    });
    await this.prisma.conversation.update({
      where: { id: convo.id },
      data: { updatedAt: new Date() },
    });

    const payload = {
      conversationId: convo.id,
      message: this.toMessage(created),
    };
    this.gateway.emitToUser(a, 'message:new', payload);
    this.gateway.emitToUser(b, 'message:new', payload);
  }

  async markRead(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    const readAt = new Date();
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: readAt },
    });
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    const other = convo?.participants.find((p) => p.userId !== userId);
    if (other) {
      this.gateway.emitToUser(other.userId, 'conversation:read', {
        conversationId,
        userId,
        readAt,
      });
    }
    return { conversationId, readAt };
  }

  private async assertParticipant(userId: string, conversationId: string) {
    const p = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!p) {
      throw new ForbiddenException('Not a participant');
    }
  }

  private async toSummary(
    userId: string,
    c: {
      id: string;
      updatedAt: Date;
      participants: {
        userId: string;
        lastReadAt: Date | null;
        user: {
          id: string;
          username: string;
          fullname: string | null;
          avatarUrl: string;
        };
      }[];
      messages: {
        senderId: string | null;
        kind: 'USER' | 'SYSTEM';
        systemKey: string | null;
        content: string | null;
        artworkId: string | null;
        createdAt: Date;
      }[];
    },
  ) {
    const me = c.participants.find((p) => p.userId === userId);
    const other = c.participants.find((p) => p.userId !== userId);
    const last = c.messages[0] ?? null;
    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: c.id,
        // Un message système n'a pas d'expéditeur : `senderId != moi` ne suffit
        // plus. Sans ce OR, le marqueur d'amitié n'allumerait pas la pastille.
        OR: [{ kind: 'SYSTEM' }, { senderId: { not: userId } }],
        ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
      },
    });
    return {
      id: c.id,
      otherUser: other ? other.user : null,
      otherLastReadAt: other?.lastReadAt ?? null,
      lastMessage: last
        ? {
            senderId: last.senderId,
            kind: last.kind,
            systemKey: last.systemKey,
            content: last.content,
            hasArtwork: last.artworkId !== null,
            createdAt: last.createdAt,
          }
        : null,
      unreadCount,
      updatedAt: c.updatedAt,
    };
  }

  private toMessage(m: {
    id: string;
    conversationId: string;
    senderId: string | null;
    kind: 'USER' | 'SYSTEM';
    systemKey: string | null;
    content: string | null;
    createdAt: Date;
    artwork: {
      id: string;
      title: string;
      mediaUrl: string | null;
      author: { id: string; username: string; fullname: string | null };
    } | null;
  }) {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      kind: m.kind,
      systemKey: m.systemKey,
      content: m.content,
      createdAt: m.createdAt,
      artwork: m.artwork,
    };
  }
}