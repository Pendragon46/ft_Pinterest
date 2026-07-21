import { Controller, Get, Post, Param, Delete,Req } from '@nestjs/common';
import { FollowService } from './follow.service';
import { Public } from 'src/decorators/public.decorator';


@Controller('users')
export class FollowController {

  constructor(private readonly followService: FollowService) {}

   @Post(':id/follow')
  follow(@Param('id') id: string, @Req() req) {

    return this.followService.follow(req.user.id, id);
  }

  @Public()
  @Get(':id/followers')
  getFollowers(@Param('id') id: string) {
    return this.followService.getFollowers(id);
  }

  @Public()
  @Get(':id/following/count')
  async getFollowingCount(@Param('id') id: string) {
    return await this.followService.getFollowingcount(id);
  }

  @Public()
  @Get(':id/followers/count')
  async getFollowersCount(@Param('id') id: string) {
	return await this.followService.getFollowerscount(id);
  }

  @Public()
  @Get(':id/following')
  async getFollowing(@Param('id') id: string) {
    return await this.followService.getFollowing(id);
  }

  @Delete(':id/unfollow')
  unfollow(@Param('id') id: string,@Req() req) {
    return this.followService.unfollow(req.user.id,  id);
  }

}
