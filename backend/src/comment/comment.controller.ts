import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('artworks')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}
 @Post(':artworkId/comment')
  //to change to @Request() req and get the user id from the token JWT
  create(@Param('artworkId') artworkId: string,@Body() data:CreateCommentDto	) {
    return this.commentService.comment(artworkId, data.loggedUser, data.comment);
  }

  @Delete(':artworkId/comment')
  remove(@Param('artworkId') artworkId: string, @Body() data:CreateCommentDto) {
    return this.commentService.remove(artworkId, data.loggedUser);
  }

  
  @Get(':artworkId/comments')
  findAll(@Param('artworkId') artworkId: string, @Body() data:CreateCommentDto) {
	return this.commentService.findAll(artworkId, data.loggedUser);
}
}
