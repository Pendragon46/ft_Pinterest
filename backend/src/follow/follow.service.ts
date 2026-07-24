import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

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
    return await this.prisma.follow.create({
      data: {
        follower: { connect: { id: currentuser } },
        following: { connect: { id: target } },
      },
    });
  }

  // Le schéma nomme les relations à l'envers : `user.followers` (relation "Follower")
  // = les comptes que l'utilisateur SUIT ; `user.following` (relation "Following")
  // = les ABONNÉS de l'utilisateur. Chaque getter est donc mappé sur la bonne relation.
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
    // delete the follow relationship
    return await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: currentuser,
          followingId: target,
        },
      },
    });
  }
}
