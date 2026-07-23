import { Controller, Get, Post, Body, Req, Param, Delete } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Public } from 'src/decorators/public.decorator';

@Controller('artworks')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}


   @Post(':artworkId/comment')
  create(@Param('artworkId') artworkId: string,@Body() data:CreateCommentDto,@Req() req) {
    return this.commentService.comment(artworkId, req.user.id, data.comment);
  }

   @Delete(':artworkId/comment/:commentId')
  remove(@Param('artworkId') artworkId: string,
  		 @Param('commentId') commentId: string,
  		 @Req() req,
		 ) {
    return this.commentService.removeComment(artworkId, commentId, req.user.id);
  }

 @Public()
 @Get(':artworkId/comments')
  findAll(@Param('artworkId') artworkId: string, @Req() req) {
	return this.commentService.findAll(artworkId, req.user?.id);
}
}
