import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
	constructor(private prisma: PrismaService){}
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

  async update(id: string, data: Prisma.UserUpdateInput) {
	let user = await this.prisma.user.findUnique({where: {id}})
	if (!user) {
	  throw new HttpException('User not found', HttpStatus.NOT_FOUND);
	}
	if (data.username) {
		user = await this.prisma.user.findUnique({where: {username : data.username as string}})
		if (user) {
		  throw new HttpException('User already taken', HttpStatus.BAD_REQUEST);
		}
	}
	if (data.email) {
		user = await this.prisma.user.findUnique({where: {email : data.email as string}})
		if (user) {
		  throw new HttpException('Email already taken', HttpStatus.BAD_REQUEST);
		}
	}
	return this.prisma.user.update({
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
