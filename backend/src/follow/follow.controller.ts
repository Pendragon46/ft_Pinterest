import { Controller, Get, Post, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { FollowService } from './follow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Controller('users')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  // GUEST est en lecture seule : USER/ADMIN pour (dés)abonner.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.user, Role.admin)
  @Post(':id/follow')
  follow(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.followService.follow(req.user.id, id);
  }

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.user, Role.admin)
  @Delete(':id/unfollow')
  unfollow(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.followService.unfollow(req.user.id, id);
  }
}
