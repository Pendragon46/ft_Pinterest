import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowService {

	constructor(private readonly prisma: PrismaService) {}

  async follow(followerId: string, followingId: string) {
	return await this.prisma.follow.create({
	  data: {
		follower: {connect: {id: followerId}},
		following: {connect: {id: followingId}},
	  },
	});
  }

  async getFollowers(userId: string) {
	const user = await this.prisma.user.findUnique({
	  where: { id: userId },
	  include: { followers: true },
	});
	if (!user) {
		throw new NotFoundException('User not found');
	}
	return user.followers;
  }
  
  async getFollowingcount(id: string) {
	const user = await this.prisma.user.findUnique({
	  where: { id: id },
	  include: { following: true },
	});
	if (!user) {
		throw new NotFoundException('User not found');
	}
	return user.following.length;
  }

  async getFollowerscount(id: string) {
	const user = await this.prisma.user.findUnique({
	  where: { id: id },
	  include: { followers: true },
	});
	if (!user) {
		throw new NotFoundException('User not found');
	}
	return user.followers.length;
  }

  async getFollowing(id: string) {
	const user = await this.prisma.user.findUnique({
	  where: { id: id },
	  include: { following: true },
	});
	if (!user) {
		throw new NotFoundException('User not found');
	}
	return user.following;
  }

  async unfollow(id: string) {
	//check if the user exists
	const user = await this.prisma.user.findUnique({
	  where: { id: id },
	  include: { following: true },
	});
	if (!user) {
		throw new NotFoundException('User not found');
	}
	//check if the follow relationship exists
	const follow = await this.prisma.follow.findUnique({
	  where: {
		followerId_followingId: {
		  followerId: id,
		  followingId: id,
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
		  followerId: id,
		  followingId: id,
		},
	  },
	});
  }
}
