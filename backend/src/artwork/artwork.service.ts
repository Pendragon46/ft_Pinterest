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
import { WebsocketGateway } from 'src/websocket/websocket.gateway';


@Injectable()
export class ArtworkService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
	private readonly friendService: FriendsService,
    private readonly gateway: WebsocketGateway,
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
      upload = await this.cloudinaryService.upload(file);
      const artwork = await this.prisma.artwork.create({
        data: {
          ...artworkdata,
          mediaUrl: upload.secure_url,
          mediaPublicId: upload.public_id,
		  resourceType: upload.resource_type,
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
      this.gateway.broadcast('artwork:created', artwork);
      return artwork;
    } catch (error) {
      if (upload && upload.public_id) {
        await this.cloudinaryService.deleteImage(upload.public_id, upload.resource_type);
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
    const friends = await this.friendService.getFriends(userId);
    const authorIds = [
      ...new Set([...followingIds, ...friends.map((friend) => friend.id)]),
    ];
    // Friends first (they land in the central tiles), then the whole pool
    // deduped — the canvas stays full and varied even with a single follow.
    const friendWorks = authorIds.length
      ? await this.prisma.artwork.findMany({
          where: { authorId: { in: authorIds } },
          orderBy: { updatedAt: 'desc' },
          include: {
            author: {
          select: { id: true, username: true, fullname: true, avatarUrl: true },
        },
            tags: { select: { name: true } },
            _count: { select: { likes: true, comments: true } },
          },
        })
      : [];
    const seen = new Set(friendWorks.map((a) => a.id));
    const general = await this.prisma.artwork.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        author: {
          select: { id: true, username: true, fullname: true, avatarUrl: true },
        },
        tags: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    return [...friendWorks, ...general.filter((a) => !seen.has(a.id))];
  }

  async findOne(id: string) {
    const artwork = await this.prisma.artwork.findUnique({
      where: {
        id: id,
      },
      include: {
        author: {
          select: { id: true, username: true, fullname: true, avatarUrl: true },
        },
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
    const normalizedtags = updatedata.tags
      ?.map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);
    this.deletetagswithoutartworks();
    return await this.prisma.artwork.update({
      where: {
        id: artworkId,
      },
      data: {
        ...(updatedata.title !== undefined && { title: updatedata.title }),
        ...(updatedata.description !== undefined && {
          description: updatedata.description,
        }),
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
      include: {
        author: {
          select: { id: true, username: true, fullname: true, avatarUrl: true },
        },
        tags: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
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
        await this.cloudinaryService.deleteImage(artwork.mediaPublicId, artwork.resourceType!);
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
    this.gateway.broadcast('artwork:deleted', { id });
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
    const caller = await this.prisma.user.findUnique({
      where: { id: connectedUserId },
    });
    if (userId !== connectedUserId && caller?.role !== 'ADMIN') {
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
          await this.cloudinaryService.deleteImage(artwork.mediaPublicId, artwork.resourceType!);
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
      this.gateway.broadcast('artwork:deleted', { id: artwork.id });
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
