import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('artworks')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}
 @Post(':artworkId/comment')
  //to change to @Request() req and get the user id from the token JWT
  create(@Param('artworkId') artworkId: string,@Body() data:CreateCommentDto	) {
    return this.commentService.comment(artworkId, "37260a66-8b53-4980-846f-35e935bbe40e", data.comment);
  }

  @Delete(':artworkId/comment/:commentId')
  remove(@Param('artworkId') artworkId: string,
  		 @Param('commentId') commentId: string,
		 ) {
    return this.commentService.removeComment(artworkId, commentId, "37260a66-8b53-4980-846f-35e935bbe40e");
  }

  
  @Get(':artworkId/comments')
  findAll(@Param('artworkId') artworkId: string, @Body() data:CreateCommentDto) {
	return this.commentService.findAll(artworkId, "37260a66-8b53-4980-846f-35e935bbe40e");
}
}
