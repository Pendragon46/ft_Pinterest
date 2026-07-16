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

//   create(@Param('artworkId') artworkId: string, @request req) {
//     return this.likesService.like(artworkId, req.user.id );
//   }

  @Delete(':artworkId/like')
  remove(@Param('artworkId') artworkId: string) {
    return this.likesService.unlike(artworkId, "37260a66-8b53-4980-846f-35e935bbe40e" );
  }

//   @Delete(':artworkId/like')
//   remove(@Param('artworkId') artworkId: string, @request req) {
//     return this.likesService.unlike(artworkId, req.user.id );
//   }

}
