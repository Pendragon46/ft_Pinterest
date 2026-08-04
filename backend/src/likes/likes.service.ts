import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async like(artworkId: string, userId: string) {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: artworkId },
    });
    if (!artwork) {
      throw new NotFoundException('Artwork not found');
    }
    return this.prisma.like.upsert({
      where: { authorId_artworkId: { authorId: userId, artworkId } },
      create: {
        artwork: { connect: { id: artworkId } },
        user: { connect: { id: userId } },
      },
      update: {},
    });
  }

  async unlike(artworkId: string, userId: string) {
    await this.prisma.like.deleteMany({ where: { authorId: userId, artworkId } });
    return { ok: true };
  }
}
