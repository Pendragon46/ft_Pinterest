import { Controller, Get, Post,Body, Param, Delete,Request } from '@nestjs/common';
import { FollowService } from './follow.service';


@Controller('follow')
export class FollowController {

  constructor(private readonly followService: FollowService) {}

  @Post('/users/:id/follow')
  //to change to @Request() req and get the user id from the token
  follow(@Param('id') id: string, @Body() Body) {

    return this.followService.follow(Body.followerId, id);
  }

  @Get('/users/:id/followers')
  getFollowers(@Param('id') id: string) {
    return this.followService.getFollowers(id);
  }

  @Get('/users/:id/following/count')
  async getFollowingCount(@Param('id') id: string) {
    return await this.followService.getFollowingcount(id);
  }

  @Get('/users/:id/followers/count')
  async getFollowersCount(@Param('id') id: string) {
	return await this.followService.getFollowerscount(id);
  }

  @Get('/users/:id/following')
  async getFollowing(@Param('id') id: string) {
    return await this.followService.getFollowing(id);
  }

  @Delete('/users/:id/follow')
  unfollow(@Param('id') id: string,) {
    return this.followService.unfollow( id);
  }
}
