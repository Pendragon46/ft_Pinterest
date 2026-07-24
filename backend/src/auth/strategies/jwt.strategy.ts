import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Shape of the JWT payload signed in AuthService.signToken.
interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    // Fail fast at boot rather than silently accepting every (or no) token.
    if (!secret) throw new Error('JWT_SECRET is not set');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret, // must match the JwtModule secret that signed the token
    });
  }

  // D3 — le rôle vient de la base, pas du token figé : une promotion ou une
  // rétrogradation prend effet immédiatement, sans attendre une reconnexion.
  // Whatever validate() returns becomes req.user.
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true },
    });
    // Compte supprimé alors que le token est encore valide → 401.
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
