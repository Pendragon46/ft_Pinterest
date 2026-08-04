import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendsService } from '../friends/friends.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class FollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendsService,
    private readonly gateway: WebsocketGateway,
    private readonly chat: ChatService,
  ) {}

  private notifyFriendsChanged(a: string, b: string): void {
    try {
      this.gateway.emitToUser(a, 'friendsChanged', null);
      this.gateway.emitToUser(b, 'friendsChanged', null);
    } catch (error) {
      console.error('friendsChanged emit failed', error);
    }
  }

  async follow(currentuser: string, target: string) {
    if (currentuser === target) {
      throw new NotFoundException('You cannot follow yourself');
    }
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentuser,
          followingId: target,
        },
      },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: target },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (existingFollow) {
      throw new BadRequestException('You are already following this user');
    }
    const created = await this.prisma.follow.create({
      data: {
        follower: { connect: { id: currentuser } },
        following: { connect: { id: target } },
      },
    });

    if (await this.friends.areMutuals(currentuser, target)) {
      this.notifyFriendsChanged(currentuser, target);
      void this.chat
        .createMutualFollowMarker(currentuser, target)
        .catch((error) =>
          console.error('mutualFollow marker failed', error),
        );
    }

    return created;
  }

  async getFollowers(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { following: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.following;
  }

  async getFollowingcount(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
      include: { followers: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.followers.length;
  }

  async getFollowerscount(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
      include: { following: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.following.length;
  }

  async getFollowing(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
      include: { followers: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.followers;
  }

  async unfollow(currentuser: string, target: string) {
    //check if the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: target },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    //check if the follow relationship exists
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentuser,
          followingId: target,
        },
      },
    });
    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }

    const wereMutuals = await this.friends.areMutuals(currentuser, target);

    const removed = await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: currentuser,
          followingId: target,
        },
      },
    });

    if (wereMutuals) {
      this.notifyFriendsChanged(currentuser, target);
    }

    return removed;
  }
}