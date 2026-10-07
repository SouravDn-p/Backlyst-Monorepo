import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { Request } from 'express';

import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from './auth.service';

type GoogleUser = {
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;

  provider: 'GOOGLE';
  providerId: string;
};

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async googleLogin(googleUser: GoogleUser, req: Request) {
    // 1. find existing provider account first
    const existingProvider = await this.prisma.authProviderAccount.findUnique({
      where: {
        provider_providerId: {
          provider: AuthProvider.GOOGLE,
          providerId: googleUser.providerId,
        },
      },
      include: {
        user: true,
      },
    });

    let user = existingProvider?.user ?? null;

    // 2. fallback to email lookup
    if (!user) {
      user = await this.prisma.user.findUnique({
        where: {
          email: googleUser.email,
        },
      });
    }

    // 3. Google authentication is restricted to fixed, pre-provisioned users.
    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'User not verified, Please verify your account first.',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('User is not active');
    }

    // 4. ensure provider link exists
    if (!existingProvider) {
      await this.prisma.authProviderAccount.create({
        data: {
          userId: user.id,
          provider: AuthProvider.GOOGLE,
          providerId: googleUser.providerId,
        },
      });
    }

    // 5. create session
    const { device, ip, userAgent } = this.authService.generateSessionInfo(req);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        device,
        ipAddress: ip,
        userAgent,
        loginAt: new Date(),
      },
    });

    // 6. generate jwt
    return this.authService.generateJwtToken({
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });
  }
}
