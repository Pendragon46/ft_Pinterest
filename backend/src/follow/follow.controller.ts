import { Controller, Get, Post,Body, Param, Delete,Request } from '@nestjs/common';
import { FollowService } from './follow.service';


@Controller('users')
export class FollowController {

  constructor(private readonly followService: FollowService) {}

  @Post(':id/follow')
  //to change to @Request() req and get the user id from the token JWT
  follow(@Param('id') id: string, @Body() Body) {

    return this.followService.follow(Body.loggedUser, id);
  }

//    @Post(':id/follow')
//   //to change to @Request() req and get the user id from the token JWT
//   follow(@Param('id') id: string, @Request() req) {

//     return this.followService.follow(req.user.id, id);
//   }

  @Get(':id/followers')
  getFollowers(@Param('id') id: string) {
    return this.followService.getFollowers(id);
  }

  @Get(':id/following/count')
  async getFollowingCount(@Param('id') id: string) {
    return await this.followService.getFollowingcount(id);
  }

  @Get(':id/followers/count')
  async getFollowersCount(@Param('id') id: string) {
	return await this.followService.getFollowerscount(id);
  }

  @Get(':id/following')
  async getFollowing(@Param('id') id: string) {
    return await this.followService.getFollowing(id);
  }

  @Delete(':id/unfollow')
  unfollow(@Param('id') id: string,@Body() Body) {
    return this.followService.unfollow(Body.loggedUser,  id);
  }

//   @Delete(':id/unfollow')
//   unfollow(@Param('id') id: string,@Request() req) {
//     return this.followService.unfollow(req.user.id,  id);
//   }
}
