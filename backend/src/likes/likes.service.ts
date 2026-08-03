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
    // Idempotent: a repeated like (two tabs, a retry, concurrent requests)
    // returns the existing row instead of violating @@unique([authorId,
    // artworkId]) with a P2002 that would surface as a 500 (or 400) in the
    // browser console.
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
    // Idempotent: unliking something not liked is a no-op, never a 400/404/500.
    await this.prisma.like.deleteMany({ where: { authorId: userId, artworkId } });
    return { ok: true };
  }
}
