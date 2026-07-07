import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '.prisma/client/wasm';
import { connect } from 'http2';

@Injectable()
export class ArtworkService {
	constructor(private readonly cloudinaryService: CloudinaryService,
				private readonly prisma: PrismaService
	) {}

   async create(data: Prisma.ArtworkCreateWithoutAuthorInput, file: Express.Multer.File) {
     if (!file) {
	   throw new BadRequestException('File is required');
	 }
	const upload = await this.cloudinaryService.uploadImage(file)

	try {
		return this.prisma.artwork.create({
			data: {
				...data,
				imageUrl: upload.secure_url,
				publicId: upload.public_id,
				author: {
					connect:{
						id :"04132647-2252-45b6-b6df-de23b095a768"// Replace with the actual user ID from the request context
					}
				}
			},
		});
	} catch (error) {
		this.cloudinaryService.deleteImage(upload.PublicId);
		throw new BadRequestException('Failed to create artwork');
	}
}


  findAllArtworks(userId: string) {
	return this.prisma.artwork.findMany({
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

  async update(id: string, updatedata: Prisma.ArtworkUpdateInput, file?: Express.Multer.File) {

	// Check if the artwork exists
	let artwork = await this.prisma.artwork.findUnique({
		where: {
			id: id,
		},
	});
	if (!artwork) {
		throw new NotFoundException('Artwork not found');
	}
	// If a new file is provided, upload it to Cloudinary and update the artwork's imageUrl and publicId
	if (file) {
	try
	{
		if (artwork.publicId) {
			this.cloudinaryService.deleteImage(artwork.publicId);
		}
	}
	catch (error) {
		throw new BadRequestException('Failed to delete previous artwork image');
	}
	try
	{
		const upload = await this.cloudinaryService.uploadImage(file);
		updatedata.imageUrl = upload.secure_url;
		updatedata.publicId = upload.public_id;
	}
	catch (error) {
		throw new BadRequestException('Failed to upload new artwork image');
	}
	}
	return this.prisma.artwork.update({
		where: {
			id: id,
		},
		data: updatedata,
	});
  }

  async remove(id: string) {
	const artwork = await this.prisma.artwork.findUnique({
		where: {
			id: id,
		},
	});
	if (!artwork) {
		throw new BadRequestException('Artwork not found');
	}
	if (artwork.publicId) {
		try {
			await this.cloudinaryService.deleteImage(artwork.publicId);
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
		if (artwork.publicId) {
			try {
				await this.cloudinaryService.deleteImage(artwork.publicId);
			} catch (error) {
				throw new BadRequestException(`Failed to delete artwork image with publicId: ${artwork.publicId}`);
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
