import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService,
				private readonly cloudinaryService: CloudinaryService
	){}
  async create(data: Prisma.UserCreateInput, file?: Express.Multer.File) {
	let uploadResult: UploadApiResponse | undefined;
	let user = await this.prisma.user.findUnique({where: {username: data.username}})
    if (user) {
      throw new ConflictException('Username already taken');

    }
	user = await this.prisma.user.findUnique({where: {email: data.email}})
	if (user) {
	  throw new ConflictException('Email already exist');
	}
	try{
		if (file) {
		uploadResult = await this.cloudinaryService.uploadImage(file);
		data.avatarUrl = uploadResult.secure_url;
		data.avatarPublicId = uploadResult.public_id;
	}
	return await this.prisma.user.create({
		data: data,})
	}
	catch (error){
			if (uploadResult && uploadResult?.public_id)
				await this.cloudinaryService.deleteImage(uploadResult.public_id);
			throw error;
		}	
	}

  async findAll() {
	return this.prisma.user.findMany();
  }

  async findOneByUsername(username: string) {
    let user =  await this.prisma.user.findUnique({
		where: {
			username
		}
	})
	if (!user) {
	  throw new NotFoundException('User not found');
	}
	return user;
  }

  async findOneById(id: string) {
	let user =  await this.prisma.user.findUnique({
		where: {
			id
		}
	})
	if (!user) {
	  throw new NotFoundException('User not found');
	}
	return user;
  }

  async update(id: string, data: Prisma.UserUpdateInput, file?: Express.Multer.File) {
	let user = await this.prisma.user.findUnique({where: {id}})
	if (!user) {
	  throw new NotFoundException('User not found');
	}
	if (data.username) {
		const existingUser = await this.prisma.user.findUnique({where: {username : data.username as string}})
		if (existingUser && existingUser.id !== id) {
		  throw new ConflictException('Username already taken');
		}
	}
	if (data.email) {
		const existingUser = await this.prisma.user.findUnique({where: {email : data.email as string}})
		if (existingUser && existingUser.id !== id) {
		  throw new ConflictException('Email already taken');
		}
	}
	if (file) {
		let OldImagePublicId = user.avatarPublicId;
		let uploadResult: UploadApiResponse | undefined;

		try {
			uploadResult= await this.cloudinaryService.uploadImage(file);
			const updatedUser = await this.prisma.user.update({
				where: { id },
				data: {
					...data,
					avatarUrl: uploadResult.secure_url,
					avatarPublicId: uploadResult.public_id,
				}
			});
			if (OldImagePublicId && OldImagePublicId !== process.env.DEFAULT_AVATAR_PUBLIC_ID) {
				try {
				await this.cloudinaryService.deleteImage(OldImagePublicId);
				} catch (error) {
					console.error('Error deleting old avatar', error);
				}
			}
			return updatedUser;
		}
		catch (error){
			if (uploadResult && uploadResult?.public_id)
				await this.cloudinaryService.deleteImage(uploadResult.public_id);
			throw error;
		}
	}
	return this.prisma.user.update({
		where: { id },
		data,
	})
}

  async removeById(id: string) {
	let user = await this.prisma.user.findUnique({where: {id}})
	if (!user) {
	  throw new NotFoundException('User not found');
	}
	if (user.avatarPublicId && user.avatarPublicId !== process.env.DEFAULT_AVATAR_PUBLIC_ID	) {
		try {
		await this.cloudinaryService.deleteImage(user.avatarPublicId);
		}
		catch (error) {
			console.error('Error deleting user avatar', error);
		}
	}
	const artworks = await this.prisma.artwork.findMany({where: {authorId: id}});
	for (const artwork of artworks) {
		if (artwork.publicId) {
			try {
				await this.cloudinaryService.deleteImage(artwork.publicId);
			} catch (error) {
				throw new BadRequestException(`Failed to delete artwork image with publicId: ${artwork.publicId}`);
			}
		}	
}
	await this.prisma.user.delete({
		where: { id },
	});
	return { message: 'User and associated artworks deleted successfully' };
}
}

