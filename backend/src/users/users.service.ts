import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService,
				private readonly cloudinaryService: CloudinaryService
	){}
  async create(data: Prisma.UserCreateInput) {
	let user = await this.prisma.user.findUnique({where: {username: data.username}})
    if (user) {
      throw new HttpException('Username already taken', HttpStatus.BAD_REQUEST);
    }
	user = await this.prisma.user.findUnique({where: {email: data.email}})
	if (user) {
	  throw new HttpException('Email already exist', HttpStatus.BAD_REQUEST);
	}
	try {
		return this.prisma.user.create({
			data
		})
	} catch (error) {
		throw new HttpException('Error creating user', HttpStatus.INTERNAL_SERVER_ERROR);
	}
}


  async findAll() {
	try {
		return this.prisma.user.findMany();
	} catch (error) {
		throw new HttpException('Error fetching users', HttpStatus.INTERNAL_SERVER_ERROR);
	}

  }

  async findOne(username: string) {
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
		let uploadResult;
		const oldUser = await this.prisma.user.findUnique({where: {id}});
		let oldAvatarUrl = oldUser?.avatarPublicId;
			try {
		try {
			uploadResult = await this.cloudinaryService.uploadImage(file);
		} catch  {
			throw new HttpException('Error uploading image', HttpStatus.INTERNAL_SERVER_ERROR);
		}
		data.avatarUrl = uploadResult.secure_url;
		data.avatarPublicId = uploadResult.public_id;
		try {
			this.prisma.user.update({
				where: {
					id
				},
				data
			})
			
		}
		catch {
			this.cloudinaryService.deleteImage(uploadResult.public_id);
			throw new HttpException('Error updating user', HttpStatus.INTERNAL_SERVER_ERROR);
		}
		if (user.avatarPublicId) {
	}
	this.prisma.user.update({
		where: {
			id
		},
		data
	})
  }

  async removeById(id: string) {
	let user = await this.prisma.user.findUnique({where: {id}})
	if (!user) {
	  throw new HttpException('User not found', HttpStatus.NOT_FOUND);
	}	
	return this.prisma.user.delete({
		where: {
			id
		}
	})
  }

  async removebyUsername(username: string) {
    let user = await this.prisma.user.findUnique({where: {username}})
	if (!user) {
	  throw new HttpException('User not found', HttpStatus.NOT_FOUND);
	}
	return this.prisma.user.delete({
		where: {
			username
		}
	})
  }
}
