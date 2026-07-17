import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { access } from 'fs';

@Injectable()
export class AuthService {
	constructor (
		private prisma: PrismaService,
		private jwtService: JwtService,
	){}
	async register(dto: RegisterDto) {

		const existingUser = await this.prisma.user.findUnique({
			where: { email: dto.email },
		});
		if (existingUser) {
			throw new BadRequestException('User already exists with this email');
		}

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

	async login(dto: LoginDto) {

		const user = await this.prisma.user.findUnique({
			where: { email: dto.email },
		});
		if (!user) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const passwordMatch = await bcrypt.compare(dto.password, user.password);
		if (!passwordMatch) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const payload = { sub: user.id, username: user.username };
		return {
			access_token: this.jwtService.sign(payload),
		};
	}
}
