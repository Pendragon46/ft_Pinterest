import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OnlineStatusService } from 'src/websocket/onlineStatus.service';

@Injectable()
export class FriendsService {
  constructor(
    private readonly Prisma: PrismaService,
    private readonly onlineStatusService: OnlineStatusService,
  ) {}
  // Friends = mutual follow: users this user follows who also follow back.
  // An unfollow mechanically breaks mutuality, so it breaks presence for free.
  async getFriends(ConnectedUserId: string) {
    const iFollow = await this.Prisma.follow.findMany({
      where: { followerId: ConnectedUserId },
      select: { followingId: true },
    });
    const iFollowIds = iFollow.map((f) => f.followingId);
    const mutuals = await this.Prisma.follow.findMany({
      where: { followerId: { in: iFollowIds }, followingId: ConnectedUserId },
      // Whitelist rather than strip: the blacklist above dropped password,
      // role, googleId and provider but kept `email`, so the friends list
      // handed out every mutual's address. The UI only needs identity + avatar.
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            fullname: true,
            avatarUrl: true,
          },
        },
      },
    });
    return mutuals.map(({ follower }) => follower);
  }

  async getOnlineFriends(userId: string) {
    const friends = await this.getFriends(userId);
    const onlineFriends = friends.filter((friend) =>
      this.onlineStatusService.isUserOnline(friend.id),
    );
    return onlineFriends;
  }

  // True when a and b follow each other — the chat access rule (CHAT_SPEC D1).
  // Two targeted lookups rather than getFriends(), which loads the whole list.
  async areMutuals(a: string, b: string): Promise<boolean> {
    const [ab, ba] = await Promise.all([
      this.Prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: a, followingId: b } },
      }),
      this.Prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: b, followingId: a } },
      }),
    ]);
    return ab !== null && ba !== null;
  }
}
