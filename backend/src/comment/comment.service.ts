import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async comment(artworkId: string, userId: string, comment: string) {
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
    return await this.prisma.comment.create({
      data: {
        artwork: { connect: { id: artworkId } },
        user: { connect: { id: userId } },
        content: comment,
      },
      include: {
        user: {
          select: { id: true, username: true, fullname: true, avatarUrl: true },
        },
      },
    });
  }

  async findAll(artworkId: string, userId?: string) {
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    const artwork = await this.prisma.artwork.findUnique({
      where: { id: artworkId },
      include: {
        comments: {
          // Newest first, decided by the server: the client used to sort on an
          // hour-floored age, so every comment posted in the same hour tied and
          // a fresh one could land anywhere in the list.
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
          select: { id: true, username: true, fullname: true, avatarUrl: true },
        },
          },
        },
      },
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
    if (comment.authorId !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You are not authorized to delete this comment',
      );
    }
    return await this.prisma.comment.delete({
      where: { id: id },
    });
  }

  async removeComment(artworkId: string, commentId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You are not authorized to delete this comment',
      );
    }
    return await this.prisma.comment.delete({
      where: { id: commentId },
    });
  }
}
