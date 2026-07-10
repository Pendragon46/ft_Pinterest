import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommentService {
  constructor(private readonly prisma:PrismaService) {}

  async comment(artworkId: string, userId: string, comment:string) {
	const user = await this.prisma.user.findUnique({
	  where: { id: userId },
	});
	if (!user) {
	  throw new NotFoundException('User not found');
	}
    const artwork = await this.prisma.artwork.findUnique({
	  where: { id: artworkId },
	});
	if (!artwork) {
	  throw new NotFoundException('Artwork not found');
	}
	return  await this.prisma.comment.create({
	  data: {
		artwork: { connect: { id: artworkId } },
		user: { connect: { id: userId } },
		content: comment
	  },
	});
  }


  async findAll(artworkId: string, userId: string) {
	const user = await this.prisma.user.findUnique({
		where: { id: userId },
	});
	if (!user) {
		throw new NotFoundException('User not found');
	}
	const artwork = await this.prisma.artwork.findUnique({
		where: { id: artworkId },
		include: { comments: true },
	});
	if (!artwork) {
		throw new NotFoundException('Artwork not found');
	}
	return artwork.comments;
  }


  async remove(id: string, userId: string) {
	const user = await this.prisma.user.findUnique({
		where: { id: userId },
	});
	if (!user) {
		throw new NotFoundException('User not found');
	}
	const comment = await this.prisma.comment.findUnique({
		where: { id: id },
	});
	if (!comment) {
		throw new NotFoundException('Comment not found');
	}
	if (comment.userId !== userId || user.role !== 'ADMIN') {
		throw new UnauthorizedException('You are not authorized to delete this comment');
	}
	 await this.prisma.comment.delete({
		where: { id: id },
	});
	return { message: 'Comment deleted successfully' };
  }
}
