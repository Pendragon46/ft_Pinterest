import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FriendsService {
	constructor(private readonly Prisma : PrismaService) {}
  
	  async requestFriendship(addresseUserId: string, ConnectedUserId: string) {
		const adresseUser = await this.Prisma.user.findUnique({ where: { id:addresseUserId } });
		if (!adresseUser) { throw new NotFoundException('User not found'); }
		if (addresseUserId === ConnectedUserId) { throw new BadRequestException('You cannot send a friend request to yourself'); }
		const Friendship = await this.Prisma.friendship.findFirst({ 
			where: { 
				OR: [
					{ requesterId: ConnectedUserId, addresseeId: addresseUserId },
					{ requesterId: addresseUserId, addresseeId: ConnectedUserId },
				],
			}
		});
		if (Friendship) {
			if (Friendship.status === 'PENDING') { throw new BadRequestException('Friend request already sent'); }
			if (Friendship.status === 'ACCEPTED') { throw new BadRequestException('You are already friends'); }
		}
		return await this.Prisma.friendship.create({
			data: {
				requesterId: ConnectedUserId,
				addresseeId: addresseUserId,
				status: 'PENDING',
			},
		});
	  }

	  async acceptFriendship(requesterUserId: string, ConnectedUserId: string) {
		const Friendship = await this.Prisma.friendship.findUnique({
			where: {
				requesterId_addresseeId: {
					requesterId: requesterUserId,
					addresseeId: ConnectedUserId,
				},
			},
		});
	  	if (!Friendship) { throw new NotFoundException('Friend request not found'); }
	  	if (Friendship.status === 'ACCEPTED') { throw new BadRequestException('You are already friends'); }
	  	return await this.Prisma.friendship.update({
			where: {
				requesterId_addresseeId: {
					requesterId: requesterUserId,
					addresseeId: ConnectedUserId,
				},
			},
			data: { status: 'ACCEPTED' },
		});
	}

	async rejectFriendship(requesterUserId: string, ConnectedUserId: string) {
		const Friendship = await this.Prisma.friendship.findUnique({
			where: {
				requesterId_addresseeId: {
					requesterId: requesterUserId,
					addresseeId: ConnectedUserId,
				},
			},
		});
	  	if (!Friendship) { throw new NotFoundException('Friend request not found'); }
		if (Friendship.status === 'ACCEPTED') { throw new BadRequestException('You are already friends'); }
	  	return await this.Prisma.friendship.delete({
			where: {
				requesterId_addresseeId: {
					requesterId: requesterUserId,
					addresseeId: ConnectedUserId,
				},
			},
		});
	}

	async getFriends(ConnectedUserId: string) {
		const friends = await this.Prisma.friendship.findMany({
			where: {
				OR: [
					{ requesterId: ConnectedUserId, status: 'ACCEPTED' },
					{ addresseeId: ConnectedUserId, status: 'ACCEPTED' },
				],
			},
			include: {
				requester: true,
				addressee: true,
			},
		});
		if (!friends) { throw new NotFoundException('No friends found'); }
		return friends;
	}

	async getFriendRequests(ConnectedUserId: string) {
		const friendRequests = await this.Prisma.friendship.findMany({
			where: {
				addresseeId: ConnectedUserId,
				status: 'PENDING',
			},
			include: {
				requester: true,
			},
		});
		if (!friendRequests) { throw new NotFoundException('No friend requests found'); }
		return friendRequests;
	}

	async getPendingFriendRequests(ConnectedUserId: string) {
		const pendingFriendRequests = await this.Prisma.friendship.findMany({
			where: {
				requesterId: ConnectedUserId,
				status: 'PENDING',
			},
			include: {
				addressee: true,
			},
		});
		if (!pendingFriendRequests) { throw new NotFoundException('No pending friend requests found'); }
		return pendingFriendRequests;
	}
	
	async getFriendsOfUser(userId: string) {
		const friends = await this.Prisma.friendship.findMany({
			where: {
				OR: [
					{ requesterId: userId, status: 'ACCEPTED' },
					{ addresseeId: userId, status: 'ACCEPTED' },
				],
			},
			include: {
				requester: true,
				addressee: true,
			},
		});
		if (!friends) { throw new NotFoundException('No friends found'); }
		return friends;
	}

	async removeFriend(friendUserId: string, ConnectedUserId: string) {
		const Friendship = await this.Prisma.friendship.findFirst({
			where: {
				OR: [
					{ requesterId: ConnectedUserId, addresseeId: friendUserId, status: 'ACCEPTED' },
					{ requesterId: friendUserId, addresseeId: ConnectedUserId, status: 'ACCEPTED' },
				],
			},
		});
	  	if (!Friendship) { throw new NotFoundException('Friendship not found'); }
	  	return await this.Prisma.friendship.delete({
			where: {
				requesterId_addresseeId: {
					requesterId: Friendship.requesterId,
					addresseeId: Friendship.addresseeId,
				},
			},
		});
	}
	
}
