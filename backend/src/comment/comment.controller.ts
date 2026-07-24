import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Controller('artworks')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // GUEST est en lecture seule : USER/ADMIN pour écrire.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.user, Role.admin)
  @Post(':artworkId/comment')
  create(
    @Param('artworkId') artworkId: string,
    @Body() data: CreateCommentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.commentService.comment(artworkId, req.user.id, data.comment);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.user, Role.admin)
  @Delete(':artworkId/comment/:commentId')
  remove(
    @Param('artworkId') artworkId: string,
    @Param('commentId') commentId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.commentService.removeComment(artworkId, commentId, req.user.id);
  }

  // Lecture : tout utilisateur authentifié, GUEST inclus.
  @UseGuards(JwtAuthGuard)
  @Get(':artworkId/comments')
  findAll(
    @Param('artworkId') artworkId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.commentService.findAll(artworkId, req.user.id);
  }
}
