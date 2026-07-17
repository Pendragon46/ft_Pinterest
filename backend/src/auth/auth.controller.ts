import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService){}

	@Post('register')
	async register(@Body() dto: RegisterDto){
		return this.authService.register(dto);
	}

	@Post('login')
	async login(@Body() dto: LoginDto) {
		return this.authService.login(dto);
	}

	// Requires a valid token; JwtStrategy puts { id, username, role } on req.user.
	@UseGuards(JwtAuthGuard)
	@Get('me')
	async me(@Req() req: { user: { id: string } }) {
		return this.authService.me(req.user.id);
	}
}
