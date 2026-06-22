import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
	constructor(private prisma: PrismaService){}
  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
		data
	})
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(username: string) {
    return this.prisma.user.findUnique({
		where: {
			username
		}
	})
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
		where: {
			id
		},
		data
	})
  }

  async remove(username: string) {
    return this.prisma.user.delete({
		where: {
			username
		}
	})
  }
}
