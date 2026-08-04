import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSearchDto } from './dto/create-search.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}
  // find global search

  async findAll(query: CreateSearchDto) {
    const [artworks, users, tags] = await Promise.all([
      this.findArtwork(query),
      this.findUser(query),
      this.findTag(query),
    ]);
    return { artworks, users, tags };
  }
  // find artworks
  async findArtwork(query: CreateSearchDto) {
    const { q, page, sort, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit ? limit : 10;

    if (sort !== 'recent' && sort !== 'oldest') {
      throw new BadRequestException('Invalid sort value');
    }
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }
    const artworks = await this.prisma.artwork.findMany({
      where: q ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                {
                  tags: {
                    some: { name: { contains: q, mode: 'insensitive' } },
                  },
                },
                { author: { username: { contains: q, mode: 'insensitive' } } },
                { author: { fullname: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {},
      skip,
      take,
      orderBy: {
        createdAt: sort === 'recent' ? 'desc' : 'asc',
      },
      include: {
        author: { select: { id: true, username: true, fullname: true } },
        tags: { select: { name: true } },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });
    return artworks;
  }

  // find users
  async findUser(query: CreateSearchDto) {
    const { q, page, sort, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit ? limit : 10;

    if (sort !== 'recent' && sort !== 'oldest') {
      throw new BadRequestException('Invalid sort value');
    }
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }
    const result = await this.prisma.user.findMany({
      where: q ? {
              OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { fullname: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {},
      select: {
        id: true,
        username: true,
        fullname: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
      skip,
      take,
      orderBy: {
        createdAt: sort === 'recent' ? 'desc' : 'asc',
      },
    });
    return result;
  }
  // find tags
  async findTag(query: CreateSearchDto) {
    const { q, page, sort, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit ? Number(limit) : 10;

    if (sort !== 'recent' && sort !== 'oldest') {
      throw new BadRequestException('Invalid sort value');
    }
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }
    const artworks = await this.prisma.artwork.findMany({
      where: q? {
              tags: {
                some: {
                  name: { contains: q, mode: 'insensitive' },
                },
              },
            }
          	: {},
      skip,
      take,
      orderBy: {
        createdAt: sort === 'recent' ? 'desc' : 'asc',
      },
      include: {
        author: { select: { id: true, username: true, fullname: true } },
        tags: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    return artworks;
  }

  async suggestTags(q: string, limit = 8) {
    const take = Math.min(Math.max(1, limit), 20);
    const tags = await this.prisma.tag.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
      select: { name: true, _count: { select: { artworks: true } } },
      orderBy: { artworks: { _count: 'desc' } },
      take,
    });
    return tags
      .filter((t) => t._count.artworks > 0)
      .map((t) => ({ name: t.name, count: t._count.artworks }));
  }
}
