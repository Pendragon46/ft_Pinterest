import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client';
import { Public } from 'src/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Protégé par le JwtAuthGuard global (pas de @Public, sinon req.user undefined → 500).
  @Get('me')
  async me(@Req() req: { user: { id: string } }) {
    return this.authService.me(req.user.id);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: { user: User }, @Res() res: Response) {
    // Redirige vers le SPA avec le token en fragment (non transmis au serveur).
    const { access_token } = await this.authService.googleLogin(req.user);
    res.redirect(`/auth/callback#token=${access_token}`);
  }
}
