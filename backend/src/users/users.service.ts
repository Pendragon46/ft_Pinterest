import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  async create(data: Prisma.UserCreateInput) {
    let user = await this.prisma.user.findUnique({
      where: { username: data.username },
    });
    if (user) {
      throw new HttpException('User already taken', HttpStatus.BAD_REQUEST);
    }
    user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (user) {
      throw new HttpException('Email already taken', HttpStatus.BAD_REQUEST);
    }
    return this.prisma.user.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(username: string) {
    return this.prisma.user.findUnique({
      where: {
        username,
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    let user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    if (data.username) {
      user = await this.prisma.user.findUnique({
        where: { username: data.username as string },
      });
      if (user) {
        throw new HttpException('User already taken', HttpStatus.BAD_REQUEST);
      }
    }
    if (data.email) {
      user = await this.prisma.user.findUnique({
        where: { email: data.email as string },
      });
      if (user) {
        throw new HttpException('Email already taken', HttpStatus.BAD_REQUEST);
      }
    }
    return this.prisma.user.update({
      where: {
        id,
      },
      data,
    });
  }

  async removeById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return this.prisma.user.delete({
      where: {
        id,
      },
    });
  }

  async removebyUsername(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return this.prisma.user.delete({
      where: {
        username,
      },
    });
  }
}
