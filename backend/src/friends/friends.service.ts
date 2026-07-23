import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OnlineStatusService } from 'src/websocket/onlineStatus.service';

@Injectable()
export class FriendsService {
	constructor(private readonly Prisma : PrismaService,
				private readonly onlineStatusService: OnlineStatusService
	) {}

  
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
		await this.Prisma.friendship.create({
			data: {
				requesterId: ConnectedUserId,
				addresseeId: addresseUserId,
				status: 'PENDING',
			},
		});
		return { message: 'Friend request sent' };
	  }

	  async acceptFriendship(requesterUserId: string, ConnectedUserId: string) {
		console.log('acceptFriendship called with requesterUserId:', requesterUserId, 'ConnectedUserId:', ConnectedUserId);
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
	  	await this.Prisma.friendship.update({
			where: {
				requesterId_addresseeId: {
					requesterId: requesterUserId,
					addresseeId: ConnectedUserId,
				},
			},
			data: { status: 'ACCEPTED' },
		});
		return { message: 'Friend request accepted' };
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
	  	await this.Prisma.friendship.delete({
			where: {
				requesterId_addresseeId: {
					requesterId: requesterUserId,
					addresseeId: ConnectedUserId,
				},
			},
		});
		return { message: 'Friend request rejected' };
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
		const friendUsers = friends.map(friend => {
			if (friend.requesterId === ConnectedUserId) {
				return friend.addressee;
			} else {
				return friend.requester;
			}
		});
		const result = friendUsers.map(({ password, role, googleId,provider, ...rest }) => rest);
		return result;
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
		if (friendRequests.length == 0) { throw new NotFoundException('No friend requests found'); }
		const result = friendRequests.map(({ requester, ...rest }) => ({
			...rest,
			requester: {
				id: requester.id,
				username: requester.username,
				email: requester.email,
				bio: requester.bio,
				avatarUrl: requester.avatarUrl,
			},
		}));
		return result;
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
		if (pendingFriendRequests.length == 0) { throw new NotFoundException('No pending friend requests found'); }
		const result = pendingFriendRequests.map(({ addressee, ...rest }) => ({
			...rest,
			addressee: {
				id: addressee.id,
				username: addressee.username,
				email: addressee.email,
				bio: addressee.bio,
				avatarUrl: addressee.avatarUrl,
			},
		}));
		return result;
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
	
	async getOnlineFriends(userId: string) {
	const friends = await this.getFriends(userId);
	const onlineFriends = friends.filter(friend => this.onlineStatusService.isUserOnline(friend.id));
	return onlineFriends;
	}
}
