import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { FriendsService } from 'src/friends/friends.service';


@Injectable()
export class ArtworkService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
	private readonly friendService: FriendsService,
  ) {}

  async findAll() {
    const artwork = await this.prisma.artwork.findMany();
    if (artwork.length === 0) {
      throw new NotFoundException('No artworks found');
    }
    return artwork;
  }

  async deletetagswithoutartworks() {
    await this.prisma.tag.deleteMany({
      where: {
        artworks: {
          none: {},
        },
      },
    });
  }

  async Updatedfile(
    userId: string,
    file: Express.Multer.File,
    updatedata: UpdateArtworkDto,
    oldPublicId: string,
  ) {
    let upload;
    let updatedArtwork;
    try {
      const normalizedtags = updatedata.tags
        ?.map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
      upload = await this.cloudinaryService.uploadImage(file);
      updatedArtwork = await this.prisma.artwork.update({
        where: {
          id: userId,
        },
        data: {
          mediaUrl: upload.secure_url,
          mediaPublicId: upload.public_id,
          ...(normalizedtags &&
            normalizedtags.length > 0 && {
              tags: {
                set: [], // Clear existing tags before connecting new ones
                connectOrCreate: normalizedtags.map((tag) => ({
                  where: { name: tag },
                  create: { name: tag },
                })),
              },
            }),
        },
      });
      await this.deletetagswithoutartworks();
    } catch (error) {
      if (upload && upload.public_id) {
        await this.cloudinaryService.deleteImage(upload.public_id);
      }
      throw new BadRequestException('Failed to update artwork');
    }
    try {
      await this.cloudinaryService.deleteImage(oldPublicId);
    } catch (error) {
      throw new BadRequestException(
        'Failed to delete old artwork image from Cloudinary',
      );
    }
    return updatedArtwork;
  }

  async create(
    data: CreateArtworkDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    // Replace with the actual user ID from the request context and check if the user exists in the database
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!file) {
      throw new BadRequestException('File is required');
    }
    let upload;
    const { tags, ...artworkdata } = data;
    const normalizedtags = data.tags
      ?.map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);
    try {
      upload = await this.cloudinaryService.uploadImage(file);
      return await this.prisma.artwork.create({
        data: {
          ...artworkdata,
          mediaUrl: upload.secure_url,
          mediaPublicId: upload.public_id,
          author: {
            connect: {
              id: user.id,
            },
          },
          ...(normalizedtags &&
            normalizedtags.length > 0 && {
              tags: {
                connectOrCreate: normalizedtags.map((tag) => ({
                  where: { name: tag },
                  create: { name: tag },
                })),
              },
            }),
        },
      });
    } catch (error) {
      if (upload && upload.public_id) {
        await this.cloudinaryService.deleteImage(upload.public_id);
      }
      throw new BadRequestException('Failed to create artwork');
    }
  }

  async getFeed(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const following = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
      },
      select: {
        followingId: true,
      },
    });
    const followingIds = following.map((f) => f.followingId);
    // Follows + mutual friends, deduplicated: one query naturally dedups the
    // artworks of an author who is both followed and a mutual.
    const friends = await this.friendService.getFriends(userId);
    const authorIds = [
      ...new Set([...followingIds, ...friends.map((friend) => friend.id)]),
    ];
    const feedArtworks = await this.prisma.artwork.findMany({
      where: { authorId: { in: authorIds } },
      orderBy: { updatedAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, fullname: true } },
        tags: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    // No follows/mutuals yet (or they have no work): fall back to the whole pool.
    if (feedArtworks.length === 0) {
      return this.prisma.artwork.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, fullname: true } },
          tags: { select: { name: true } },
          _count: { select: { likes: true, comments: true } },
        },
      });
    }
    return feedArtworks;
  }

  async findOne(id: string) {
    const artwork = await this.prisma.artwork.findUnique({
      where: {
        id: id,
      },
      include: {
        author: { select: { id: true, username: true, fullname: true } },
        tags: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!artwork) {
      throw new NotFoundException('Artwork not found');
    }
    return artwork;
  }

  async update(
    artworkId: string,
    updatedata: UpdateArtworkDto,
    user: { id: string; role: string },
    file?: Express.Multer.File,
  ) {
    const artwork = await this.prisma.artwork.findUnique({
      where: {
        id: artworkId,
      },
    });
    if (!artwork) {
      throw new NotFoundException('Artwork not found');
    }
    if (artwork.authorId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You are not authorized to update this artwork',
      );
    }
    if (file && artwork.mediaPublicId) {
      return await this.Updatedfile(
        artworkId,
        file,
        updatedata,
        artwork.mediaPublicId,
      );
    }
    const normalizedtags = updatedata.tags
      ?.map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);
    this.deletetagswithoutartworks();
    return await this.prisma.artwork.update({
      where: {
        id: artworkId,
      },
      data: {
        ...(normalizedtags &&
          normalizedtags.length > 0 && {
            tags: {
              set: [], // Clear existing tags before connecting new ones
              connectOrCreate: normalizedtags.map((tag) => ({
                where: { name: tag },
                create: { name: tag },
              })),
            },
          }),
      },
    });
  }

  async remove(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const artwork = await this.prisma.artwork.findUnique({
      where: {
        id: id,
      },
    });

    if (!artwork) {
      throw new NotFoundException('Artwork not found');
    }
    if (artwork.authorId !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You are not authorized to delete this artwork',
      );
    }
    if (artwork.mediaPublicId) {
      try {
        await this.cloudinaryService.deleteImage(artwork.mediaPublicId);
      } catch (error) {
        throw new BadRequestException(
          'Failed to delete artwork image from Cloudinary',
        );
      }
    }

    await this.deletetagswithoutartworks();
    await this.prisma.artwork.delete({
      where: {
        id: id,
      },
    });
    return { message: 'Artwork deleted successfully' };
  }

  async deleteAllArtworksByUser(userId: string, connectedUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.id !== connectedUserId && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You are not authorized to delete artworks for this user',
      );
    }
    const artworks = await this.prisma.artwork.findMany({
      where: {
        authorId: userId,
      },
    });
    for (const artwork of artworks) {
      if (artwork.mediaPublicId) {
        try {
          await this.cloudinaryService.deleteImage(artwork.mediaPublicId);
        } catch (error) {
          throw new BadRequestException(
            `Failed to delete artwork image with publicId: ${artwork.mediaPublicId}`,
          );
        }
      }
      await this.prisma.artwork.delete({
        where: {
          id: artwork.id,
        },
      });
    }
    await this.deletetagswithoutartworks();
    return {
      message: 'All artworks by the user have been deleted successfully',
    };
  }

  async getArtworkLikes(artworkId: string) {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: artworkId },
      include: { likes: true },
    });
    if (!artwork) {
      throw new NotFoundException('Artwork not found');
    }
    return artwork.likes;
  }
}
