import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
	constructor (
		private prisma: PrismaService
	){}
	async register(dto: RegisterDto) {

		// password hashing and shenanigans
		const hashedPassword = await bcrypt.hash(dto.password, 10);

		const user = await this.prisma.user.create({
			data: {
				fullname: dto.fullname,
				username: dto.username,
				email: dto.email,
				password: hashedPassword,
				bio: dto.bio,
			},
		});

		const { password, ...result } = user;
		return result;
	}
}
