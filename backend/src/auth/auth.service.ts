import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User, Provider } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cloudinary: CloudinaryService,
  ) {}

  private signToken(user: User): { access_token: string } {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return { access_token: this.jwtService.sign(payload) };
  }

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          fullname: dto.fullname,
          username: dto.username,
          email: dto.email,
          password: hashedPassword,
          bio: dto.bio,
        },
      });
      // Return a token (not the user) so the frontend logs in immediately
      // after signup, then calls GET /auth/me for the fresh profile.
      return this.signToken(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const field = Array.isArray(target)
          ? String(target[0])
          : String(target);
        if (field.includes('username'))
          return { fieldErrors: { username: 'auth.usernameTaken' } };
        return { fieldErrors: { email: 'auth.emailTaken' } };
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.password) {
      return { error: 'invalid_credentials' as const };
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      return { error: 'invalid_credentials' as const };
    }

    return this.signToken(user);
  }

  // Current user from the id the JwtStrategy extracted from the token. Never
  // return the password hash.
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const { password, ...result } = user;
    return result;
  }


  private async adoptGoogleAvatar(
    remoteUrl?: string,
  ): Promise<{ avatarUrl: string; avatarPublicId: string } | undefined> {
    if (!remoteUrl) return undefined;
    const uploaded = await this.cloudinary.uploadRemote(remoteUrl);
    if (!uploaded) return undefined;
    return {
      avatarUrl: uploaded.secure_url,
      avatarPublicId: uploaded.public_id,
    };
  }

  async validateGoogleUser(googleUser: {
    email: string;
    fullname?: string;
    googleId: string;
    avatarUrl?: string;
  }): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
    });
    if (user) {
      if (!user.avatarPublicId && googleUser.avatarUrl) {
        const avatar = await this.adoptGoogleAvatar(googleUser.avatarUrl);
        if (avatar) {
          return this.prisma.user.update({
            where: { id: user.id },
            data: avatar,
          });
        }
      }
      return user;
    }

    user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });
    if (user) {
      const avatar = user.avatarPublicId
        ? undefined
        : await this.adoptGoogleAvatar(googleUser.avatarUrl);
      return this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.googleId,
          provider: Provider.GOOGLE,
          ...(avatar ?? {}),
        },
      });
    }

    const username = await this.generateUniqueUsername(googleUser.email);
    const avatar = await this.adoptGoogleAvatar(googleUser.avatarUrl);

    return this.prisma.user.create({
      data: {
        email: googleUser.email,
        fullname: googleUser.fullname,
        username,
        googleId: googleUser.googleId,
        provider: Provider.GOOGLE,
        ...(avatar ?? {}),
      },
    });
  }

  async googleLogin(user: User) {
    return this.signToken(user);
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    let candidate = base;
    let suffix = 0;
    while (
      await this.prisma.user.findUnique({ where: { username: candidate } })
    ) {
      suffix++;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  }
}
