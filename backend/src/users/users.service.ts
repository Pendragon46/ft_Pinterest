import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService,
				private readonly cloudinaryService: CloudinaryService
	){}
  async create(data: Prisma.UserCreateInput) {
	let user = await this.prisma.user.findUnique({where: {username: data.username}})
    if (user) {
      throw new BadRequestException('Username already taken');

    }
	user = await this.prisma.user.findUnique({where: {email: data.email}})
	if (user) {
	  throw new BadRequestException('Email already exist');
	}
	try {
		return this.prisma.user.create({
			data
		})
	} catch (error) {
		throw new BadRequestException('Error creating user');
	}
}


  async findAll() {
	try {
		return this.prisma.user.findMany();
	} catch (error) {
		throw new HttpException('Error fetching users', HttpStatus.INTERNAL_SERVER_ERROR);
	}

  }

  async findOneByUsername(username: string) {
    let user =  await this.prisma.user.findUnique({
		where: {
			username
		}
	})
	if (!user) {
	  throw new HttpException('User not found', HttpStatus.NOT_FOUND);
	}
	return user;
  }

  async searchUsers(query: string) {
	try {
	  const users = await this.prisma.user.findMany({
		where: {
		  OR: [
			{ username: { contains: query, mode: 'insensitive' } },
			{ fullname: { contains: query, mode: 'insensitive' } },
		  ],
		},
	  });
  
	  return users;
	} catch (error) {
	  throw new HttpException('Error searching users', HttpStatus.NOT_FOUND);
	}
  }

  async findOneById(id: string) {
	let user =  await this.prisma.user.findUnique({
		where: {
			id
		}
	})
	if (!user) {
	  throw new HttpException('User not found', HttpStatus.NOT_FOUND);
	}
	return user;
  }

  async update(id: string, data: Prisma.UserUpdateInput, file?: Express.Multer.File) {
	let user = await this.prisma.user.findUnique({where: {id}})
	if (!user) {
	  throw new HttpException('User not found', HttpStatus.NOT_FOUND);
	}
	if (data.username) {
		const existingUser = await this.prisma.user.findUnique({where: {username : data.username as string}})
		if (existingUser && existingUser.id !== id) {
		  throw new HttpException('User already taken', HttpStatus.BAD_REQUEST);
		}
	}
	if (data.email) {
		const existingUser = await this.prisma.user.findUnique({where: {email : data.email as string}})
		if (existingUser && existingUser.id !== id) {
		  throw new HttpException('Email already taken', HttpStatus.BAD_REQUEST);
		}
	}
	if (file) {
		let OldImagePublicId = user.avatarPublicId;
		let uploadResult: any ;

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
			if (OldImagePublicId) {
				await this.cloudinaryService.deleteImage(OldImagePublicId);
			}
			return updatedUser;
		}
		catch {
			if (uploadResult && uploadResult?.public_id)
				await this.cloudinaryService.deleteImage(uploadResult.public_id);
			throw new HttpException('Error updating user', HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
	return this.prisma.user.update({
		where: { id },
		data,
	})
}

  async removeById(id: string) {
	let user = await this.prisma.user.findUnique({where: {id}})
	console.log("Removing user:", user);
	if (!user) {
	  throw new HttpException('User not found', HttpStatus.NOT_FOUND);
	}
	if (user.avatarPublicId && user.avatarPublicId !== process.env.DEFAULT_AVATAR_PUBLIC_ID	) {
		await this.cloudinaryService.deleteImage(user.avatarPublicId);
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
		await this.prisma.artwork.delete({
			where: {
				id: artwork.id,
			},
	});
}
	await this.prisma.user.delete({
		where: { id },
	});
	return { message: 'User and associated artworks deleted successfully' };
}
}

