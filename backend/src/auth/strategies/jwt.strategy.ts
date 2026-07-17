import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';

// Shape of the JWT payload signed in AuthService.signToken.
interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    // Fail fast at boot rather than silently accepting every (or no) token.
    if (!secret) throw new Error('JWT_SECRET is not set');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret, // must match the JwtModule secret that signed the token
    });
  }

  // Whatever validate() returns becomes req.user. `role` is here so the global
  // RolesGuard (which reads req.user.role) can authorise admin routes.
  validate(payload: JwtPayload) {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
