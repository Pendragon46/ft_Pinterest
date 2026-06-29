import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArtworkService {
	constructor(private readonly cloudinaryService: CloudinaryService,
				private readonly prisma: PrismaService
	) {}

   async create(createArtworkDto: CreateArtworkDto, file: Express.Multer.File) {
     if (!file) {
	   throw new BadRequestException('File is required');
	 }
	const upload = await this.cloudinaryService.uploadImage(file)

	try {
		return this.prisma.artwork.create({
			data: {
				...createArtworkDto,
				imageUrl: upload.secure_url,
				publicId: upload.public_id,
				authorId: "f01bf0e0-1743-4cbb-9bba-b790e84f08b4",// Replace with the actual user ID from the request context
			},
		});
	} catch (error) {
		this.cloudinaryService.deleteImage(upload.PublicId);
		throw new BadRequestException('Failed to create artwork');
	}
}

  findAll(tag: string) {
	return this.prisma.artwork.findMany({
		where: {
			tags: {
				some: {
					content: tag,
				},
			},
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

  async update(id: string, updateArtworkDto: UpdateArtworkDto, file?: Express.Multer.File) {

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
		updateArtworkDto.imageUrl = upload.secure_url;
		updateArtworkDto.publicId = upload.public_id;
	}
	catch (error) {
		throw new BadRequestException('Failed to upload new artwork image');
	}
	}
	return this.prisma.artwork.update({
		where: {
			id: id,
		},
		data: updateArtworkDto,
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
	
	const publicId = artwork.publicId;
	if (publicId) {
		try {
			await this.cloudinaryService.deleteImage(publicId);
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
}
