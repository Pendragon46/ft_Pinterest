import { Controller, Get, Post, Param, Delete, Body } from '@nestjs/common';
import { LikesService } from './likes.service';

@Controller('artworks')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':artworkId/like')
  //to change to @Request() req and get the user id from the token JWT
  create(@Param('artworkId') artworkId: string) {
    return this.likesService.like(artworkId, "37260a66-8b53-4980-846f-35e935bbe40e" );
  }

  @Delete(':artworkId/like')
  remove(@Param('artworkId') artworkId: string) {
    return this.likesService.unlike(artworkId, "37260a66-8b53-4980-846f-35e935bbe40e" );
  }

  @Get(':artworkId/likes')
  async getLikes(@Param('artworkId') artworkId: string) {
	return await this.likesService.getArtworkLikes(artworkId);
  }
}
