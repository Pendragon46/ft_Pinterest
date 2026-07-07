import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';

@Injectable()
export class ArtworkService {
	constructor(private readonly cloudinaryService: CloudinaryService,
				private readonly prisma: PrismaService
	) {}

   async create(data: CreateArtworkDto, file: Express.Multer.File) {
	// check if the user exists
	let user ="e3d714f3-1968-4ba8-9f7f-1cfe834f8116";
	 // Replace with the actual user ID from the request context

	if (!user) {
		throw new NotFoundException('User not found');
	}
     if (!file) {
	   throw new BadRequestException('File is required');
	 }
	let upload;
	const { tags, ...artworkdata } = data;
	const normalizedtags = data.tags?.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
	try {
		upload = await this.cloudinaryService.uploadImage(file)
		return await this.prisma.artwork.create({
			data: {
				...artworkdata,
				mediaUrl: upload.secure_url,
				mediaPublicId: upload.public_id,
				author: {
					connect:{
						id : user// Replace with the actual user ID from the request context
					},
				},
				...(normalizedtags && normalizedtags.length > 0 && {
					tags: {
						connectOrCreate: normalizedtags.map(tag => ({
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
	}}



  async findAllArtworks(userId: string) {
	return await this.prisma.artwork.findMany({
		where: {
			authorId: userId,
		},
	});
}

  findOne(id: string) {
	let artwork = this.prisma.artwork.findUnique({
		where: {
			id: id,
		},
	});
	if (!artwork) {
		throw new NotFoundException('Artwork not found');
	}
	return artwork;
  }

  async update(id: string, updatedata: UpdateArtworkDto, file?: Express.Multer.File) {


	
	// Check if the artwork exists
	let artwork = await this.prisma.artwork.findUnique({
		where: {
			id: id,
		},
	});
	if (!artwork) {
		throw new NotFoundException('Artwork not found');
	}

	
	const {tags, ...artworkdata} = updatedata;
	const normalizedtags = updatedata.tags?.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
	// If a new file is provided, upload it to Cloudinary and update the artwork's imageUrl and publicId
	if (file) {
		let upload;
	try
	{
		const oldPublicId = artwork.mediaPublicId;
		upload = await this.cloudinaryService.uploadImage(file);
		const updatedpost =  await this.prisma.artwork.update({
			where: {
				id: id,
			},
			data: {
				...artworkdata,
				mediaUrl: upload.secure_url,
				mediaPublicId: upload.public_id,
				...(normalizedtags && normalizedtags.length > 0 && {
					tags: {
						connectOrCreate: normalizedtags.map(tag => ({
							where: { name: tag },
							create: { name: tag },
						})),
					},
				}),
			},
		});
		if (oldPublicId) {
		try {
			await this.cloudinaryService.deleteImage(oldPublicId);
		} catch (error) {
			console.error('Error deleting old artwork image', error);
			throw error;
		}
		return updatedpost;
	}
}
	catch (error) {
		if (upload && upload.public_id) {
			await this.cloudinaryService.deleteImage(upload.public_id);
		}
		throw new BadRequestException('Failed to update artwork');
	}
	}
	const result = true && "test";
	console.log(result);
	return this.prisma.artwork.update({
		where: {
			id: id,
		},
		data: {
			...artworkdata,
			...(normalizedtags && normalizedtags.length > 0 && {
				tags: {
					connectOrCreate: normalizedtags.map(tag => ({
						where: { name: tag },
						create: { name: tag },
					})),
				},
			}),
		}
	});
  }

  async remove(id: string) {
	const artwork = await this.prisma.artwork.findUnique({
		where: {
			id: id,
		},
	});
	if (!artwork) {
		throw new NotFoundException('Artwork not found');
	}
	if (artwork.mediaPublicId) {
		try {
			await this.cloudinaryService.deleteImage(artwork.mediaPublicId);
		} catch (error) {
			throw new BadRequestException('Failed to delete artwork image from Cloudinary');
		}
	}
	return this.prisma.artwork.delete({
		where: {
			id: id,
		},
	});
  }

  async deleteAllArtworksByUser(userId: string) {
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
				throw new BadRequestException(`Failed to delete artwork image with publicId: ${artwork.mediaPublicId}`);
			}
		}
		await this.prisma.artwork.delete({
			where: {
				id: artwork.id,
			},
	});
}
	return { message: 'All artworks by the user have been deleted successfully' };
}
}
