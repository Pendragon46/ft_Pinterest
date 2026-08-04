import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';


@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll() {
    return await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: { id: true,fullname: true,username: true,email: true,bio: true,avatarUrl: true,role: true,createdAt: true,updatedAt: true,
		_count: { select: { artworks: true, comments: true } },
      },
    });
  }

  async findOneByUsername(username: string) {
    const user = await this.prisma.user.findMany({
      where: {
        username: {
          contains: username,
          mode: 'insensitive',
        },
      },
      orderBy: {
        username: 'asc',
      },
      select: {id: true,username: true,fullname: true,bio: true,avatarUrl: true,createdAt: true,},
    });
    if (!user || user.length === 0) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        artworks: true,
        _count: {
          select: {artworks: true,followers: true,following: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, googleId, provider, ...result } = user;
    return result;
  }

  async findOneById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, googleId, role, provider, email, ...result } = user;
    return result;
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
	loggedUserId: string,
    file?: Express.Multer.File    
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (id !== loggedUserId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: loggedUserId },
      });
      if (!actor || actor.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'You are not authorized to update this user',
        );
      }
    }
    delete (data as { avatarUrl?: unknown }).avatarUrl;
    delete (data as { avatarPublicId?: unknown }).avatarPublicId;

    if (data.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: data.username as string },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Username already taken');
      }
    }
	if (data.password)
	{
		data.password = await bcrypt.hash(data.password as string , 10);
	}
    if (data.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email as string },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already taken');
      }
    }
    if (file) {
      const OldImagePublicId = user.avatarPublicId;
      let uploadResult: UploadApiResponse | undefined;
      try {
        uploadResult = await this.cloudinaryService.upload(file);
        const updatedUser = await this.prisma.user.update({
          where: { id },
          data: {
            ...data,
            avatarUrl: uploadResult.secure_url,
            avatarPublicId: uploadResult.public_id,
          },
        });
        if (
          OldImagePublicId &&
          OldImagePublicId !== process.env.DEFAULT_AVATAR_PUBLIC_ID
        ) {
          try {
            await this.cloudinaryService.deleteImage(OldImagePublicId, 'image');
          } catch (error) {
            console.error('Error deleting old avatar', error);
            throw error;
          }
        }
        const { password, ...result } = updatedUser;
        return result;
      } catch (error) {
        if (uploadResult?.public_id)
          await this.cloudinaryService.deleteImage(uploadResult.public_id, uploadResult.resource_type);
        throw error;
      }
    }
    return await this.prisma.user.update({
      where: { id },
      data,
      select: {id: true,username: true,fullname: true,email: true,bio: true,avatarUrl: true,role: true,createdAt: true,
      },
    });
  }

  async getUserArtworks(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        artworks: {
          include: {
            _count: {
              select: {likes: true,comments: true,},
            },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.artworks;
  }

  async getUserLikedArtworks(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const likedArtworks = await this.prisma.artwork.findMany({
      where: {
        likes: {
          some: {
            authorId: userId,
          },
        },
      },
      include: {
        _count: {
          select: {likes: true,comments: true,
          },
        },
      },
    });
    return likedArtworks;
  }

  async removeById(id: string, loggedUserId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const loggedUser = await this.prisma.user.findUnique({
      where: { id: loggedUserId },
    });
    if (!loggedUser) {
      throw new NotFoundException('Logged user not found');
    }
    if (id !== loggedUserId && loggedUser.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You are not authorized to delete this user',
      );
    }
    if (user.role === Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        return { ok: false as const, reason: 'last_admin' };
      }
    }
    if (
      user.avatarPublicId &&
      user.avatarPublicId !== process.env.DEFAULT_AVATAR_PUBLIC_ID
    ) {
      try {
        await this.cloudinaryService.deleteImage(user.avatarPublicId, 'image');
      } catch (error) {
        console.error('Error deleting user avatar', error);
      }
    }
    const artworks = await this.prisma.artwork.findMany({
      where: { authorId: id },
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
    }
    const convoIds = (
      await this.prisma.conversationParticipant.findMany({
        where: { userId: id },
        select: { conversationId: true },
      })
    ).map((p) => p.conversationId);
    await this.prisma.user.delete({
      where: { id },
    });
    if (convoIds.length > 0) {
      await this.prisma.conversation.deleteMany({
        where: { id: { in: convoIds } },
      });
    }
    await this.prisma.tag.deleteMany({
      where: {
        artworks: {
          none: {},
        },
      },
    });
    return { ok: true as const };
  }

  async updateRoles(id: string, role: Role, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (id === actorId && role !== Role.ADMIN) {
      return { ok: false as const, reason: 'self_demote' };
    }
    if (user.role === Role.ADMIN && role !== Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        return { ok: false as const, reason: 'last_admin' };
      }
    }
    await this.prisma.user.update({
      where: { id },
      data: { role },
    });
    return { ok: true as const };
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullname: true,
        username: true,
        email: true,
        bio: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        artworks: {
          select: {
            id: true,
            title: true,
            description: true,
            mediaUrl: true,
            createdAt: true,
            updatedAt: true,
            tags: { select: { name: true } },
          },
        },
        comments: {
          select: {
            id: true,
            content: true,
            artworkId: true,
            createdAt: true,
          },
        },
        likes: { select: { id: true, artworkId: true, createdAt: true } },
        followers: { select: { followingId: true, createdAt: true } },
        following: { select: { followerId: true, createdAt: true } },
        _count: {
          select: {
            artworks: true,
            comments: true,
            likes: true,
            followers: true,
            following: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const {
      _count,
      artworks,
      comments,
      likes,
      followers,
      following,
      createdAt,
      updatedAt,
      ...account
    } = user;
    return {
      exportedAt: new Date().toISOString(),
      format: 'atlaas-gdpr-export-v1',
      notice:
        "Ce fichier contient toutes les données personnelles associées à votre compte Atlaas. Il n'inclut jamais votre mot de passe.",
      account: { ...account, registeredAt: createdAt, lastUpdatedAt: updatedAt },
      artworks,
      comments,
      likes,
      following: followers, // comptes que l'utilisateur suit (relation inversee)
      followers: following, // abonnés de l'utilisateur (relation inversee)
      counts: {
        artworks: _count.artworks,
        comments: _count.comments,
        likes: _count.likes,
        following: _count.followers, // inverse
        followers: _count.following, // inverse
      },
    };
  }
}
