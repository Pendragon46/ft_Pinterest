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

  // One place that mints the token so login and register stay in sync. `role`
  // travels in the payload so the JwtStrategy can hand it to RolesGuard.
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
      // Unique constraint hit (email or username already taken). Turn Prisma's
      // raw P2002 into a clean 409 tagged with the offending field, so the
      // frontend maps it to the right input (see http.ts fieldErrors).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const field = Array.isArray(target)
          ? String(target[0])
          : String(target);
        // 2xx result (not 409) so the browser logs no network error.
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

    // 2xx result (not 401) so the browser logs no network error.
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

  // --- Google additions below ---

  // Google hands us a lh3.googleusercontent.com URL. Never persist it: that host
  // sends no CORS header and rate-limits hotlinking, so the browser ends up with
  // a blank avatar (429 in Chrome, an aborted request in Firefox). Copy it into
  // Cloudinary once and store our own URL instead. On failure we return
  // undefined, so the caller falls back to the schema default rather than the
  // unusable Google URL.
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
      // A returning Google user whose stored avatar is still a Google URL (or
      // was never set) predates this copy step — heal it on the next sign-in.
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
      // Linking Google to an existing local account: adopt the photo too, but
      // only if the user never set one of their own.
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
