import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Reusable guard: apply @UseGuards(JwtAuthGuard) to any route that requires a
// valid token. It triggers JwtStrategy, which populates req.user (401 if absent
// or invalid).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
