import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LikesService {
	constructor(private readonly prisma: PrismaService) {}
  async like(artworkId: string, userId : string) {
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
	const existingLike = await this.prisma.like.findFirst({
	  where: {
		artworkId: artworkId,
		authorId: userId,
	  },
	});
	if (existingLike) {
	  throw new BadRequestException('You have already liked this artwork');
	}
	return await this.prisma.like.create({
	  data: {
		artwork: { connect: { id: artworkId } },
		user: { connect: { id: userId } },
	  },
	});
  }



  async unlike(artworkId: string, userId: string) {
	const artwork = await this.prisma.artwork.findUnique({
	  where: { id: artworkId },
	});
	if (!artwork) {
	  throw new NotFoundException('Artwork not found');
	}
	const existingLike = await this.prisma.like.findFirst({
	  where: {
		artworkId: artworkId,
		authorId: userId,
	  },
	});
	if (!existingLike) {
	  throw new BadRequestException('You have not liked this artwork');
	}
	return await this.prisma.like.delete({
	  where: { id: existingLike.id },
	});
  }


}
