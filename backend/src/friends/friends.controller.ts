import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FriendsService } from './friends.service';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}


  @Get()
  getFriends(@Req() req) {
    return this.friendsService.getFriends(req.user.id);
  }

  @Get('online')
  getOnlineFriends(@Req() req) {
    return this.friendsService.getOnlineFriends(req.user.id);
  }

}
