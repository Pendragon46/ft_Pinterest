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
		this.findTag(query)
	]);
	return { artworks, users, tags };
  }
  // find artworks
  async findArtwork(query: CreateSearchDto) {
	const { q, page, sort, limit } = query;
	const skip = (Number(page) - 1) * Number(limit);
	const take = limit ? Number(limit): 10;
	
	if (sort !== 'recent' && sort !== 'oldest') {
		throw new BadRequestException('Invalid sort value');
	}
	if (Number(page) < 1 || Number(limit) < 1) {
		throw new BadRequestException('Page and limit must be greater than 0');
	}
	const artworks = await this.prisma.artwork.findMany({
		where: {
			...(q ? {
				OR: [
					{ title: { contains: q, mode: 'insensitive' } },
					{ description: { contains: q, mode: 'insensitive' } },
					{tags: { some: { name: { contains: q, mode: 'insensitive' } } } },
				],
			} : {})
		},
		skip,
		take,
		orderBy: {
			createdAt: sort === 'recent' ? 'desc' : 'asc',
		},
		include: {
			_count: {
				select: {
					likes: true,
					comments: true,
				}
			}
		}
	});
	return artworks;
  }

  // find users
  async findUser(query: CreateSearchDto) {
	const { q, page, sort, limit } = query;
	const skip = (Number(page) - 1) * Number(limit);
	const take = limit ?Number(limit) : 10;
	
	if (sort !== 'recent' && sort !== 'oldest') {
		throw new BadRequestException('Invalid sort value');
	}
	if (Number(page) < 1 || Number(limit) < 1) {
		throw new BadRequestException('Page and limit must be greater than 0');
	}
	const user = await this.prisma.user.findMany({
		where: {
			...(q ? {
				OR: [
					{ username: { contains: q, mode: 'insensitive' } },
					{ fullname: { contains: q, mode: 'insensitive' } },
				],
			} : {})
		},
		skip,
		take,
		orderBy: {
			createdAt: sort === 'recent' ? 'desc' : 'asc',
		},
	});
	return user;
  }
  // find tags
  async findTag(query: CreateSearchDto) {
	const { q, page, sort, limit } = query;
	const skip = (Number(page) - 1) * Number(limit);
	const take = limit ? Number(limit): 10;
	
	if (sort !== 'recent' && sort !== 'oldest') {
		throw new BadRequestException('Invalid sort value');
	}
	if (Number(page) < 1 || Number(limit) < 1) {
		throw new BadRequestException('Page and limit must be greater than 0');
	}
	const artworks = await this.prisma.artwork.findMany({
		where: {
			...(q ? {
				tags: { some: {
					name: { contains: q, mode: 'insensitive' },
				},
			}} : {})
		},
		skip,
		take,
		orderBy: {
			createdAt: sort === 'recent' ? 'desc' : 'asc',
		},
	});
	return artworks;
  }
}
