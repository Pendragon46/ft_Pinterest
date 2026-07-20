import { Controller, Get, Post, Delete, Param, Req } from '@nestjs/common';
import { FriendsService } from './friends.service';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request/:userId')
  requestFriendship(@Param('userId') userId: string,
  					@Req() req) {
	return this.friendsService.requestFriendship(userId, req.user.id);
  }

  @Post('accept/:userId')
  acceptFriendship(@Param('id') userId: string,
  					@Req() req) {
	return this.friendsService.acceptFriendship(userId, req.user.id);
  }

  @Post('reject/:userId')
  rejectFriendship(@Param('id') userId: string,
  					@Req() req) {
	return this.friendsService.rejectFriendship(userId, req.user.id);
  }

  @Get()
  getFriends(@Req() req) {
	return this.friendsService.getFriends(req.user.id);
  }

  @Get(':userId')
  getFriendsOfUser(@Param('userId') userId: string) {
	return this.friendsService.getFriendsOfUser(userId);
  }

  @Get('requests')
  getFriendRequests(@Req() req) {
	return this.friendsService.getFriendRequests(req.user.id);
  }
  
  @Get('requests/pending')
  getPendingFriendRequests(@Req() req) {
	return this.friendsService.getPendingFriendRequests(req.user.id);
  }
}
