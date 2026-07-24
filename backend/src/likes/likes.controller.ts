import { Controller, Post, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Controller('artworks')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  // GUEST est en lecture seule : seuls USER/ADMIN peuvent liker.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.user, Role.admin)
  @Post(':artworkId/like')
  create(
    @Param('artworkId') artworkId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.likesService.like(artworkId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.user, Role.admin)
  @Delete(':artworkId/like')
  remove(
    @Param('artworkId') artworkId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.likesService.unlike(artworkId, req.user.id);
  }
}
