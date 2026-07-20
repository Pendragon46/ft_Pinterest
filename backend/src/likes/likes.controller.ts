import { Controller, Req, Post, Param, Delete } from '@nestjs/common';
import { LikesService } from './likes.service';

@Controller('artworks')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':artworkId/like')
  create(@Param('artworkId') artworkId: string, @Req() req) {
    return this.likesService.like(artworkId, req.user.id );
  }


  @Delete(':artworkId/like')
  remove(@Param('artworkId') artworkId: string, @Req() req) {
    return this.likesService.unlike(artworkId, req.user.id );
  }

}
