import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload } from 'src/types';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const jwtSecret = configService.getOrThrow<string>('JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        isDeleted: true,
        status: true,
        suspendEnd: true,
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status === 'BANNED') {
      throw new UnauthorizedException('User is banned');
    }

    if (user.status === 'SUSPENDED') {
      // 🔥 Defensive check (in case Bull job is delayed or failed)
      if (user.suspendEnd && user.suspendEnd > new Date()) {
        throw new UnauthorizedException(
          `User is suspended until ${user.suspendEnd.toISOString()}`,
        );
      }
    }

    // 🔥 SESSION VALIDATION (important addition)
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      select: {
        id: true,
        userId: true,
        logoutAt: true,
      },
    });

    if (!session || session.userId !== user.id) {
      throw new UnauthorizedException('Invalid session');
    }

    if (session.logoutAt) {
      throw new UnauthorizedException('Session expired');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: payload.sessionId,
    };
  }
}
