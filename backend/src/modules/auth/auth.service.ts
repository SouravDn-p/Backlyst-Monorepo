import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import * as bcrypt from 'bcrypt';
import { CreateUserByAdminDto, CreateUserDto } from './dto/create-user.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from 'src/types';
import { LoginDto } from './dto/login.dto';
import { MailService } from 'src/common/utils/mail/mail.service';
import { Request } from 'express';
import { MessagingGateway } from '../messaging/messaging.gateway';
import { NotificationType, Prisma, UserRole } from '@prisma/client';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { UserSubscriptionService } from '../subscription/user-subscription/user-subscription.service';
import { AdminAuthorizationService } from '../admin/admin-authorization/admin-authorization.service';
import { createReferralNotificationIfAllowed } from '../credit/referrer/referral-notification.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private readonly mail: MailService,
    private readonly messagingGateway: MessagingGateway,
    private readonly s3: AwsS3Service,
    private readonly userSubscriptionService: UserSubscriptionService,
    private readonly adminAuthorizationService: AdminAuthorizationService,
  ) {}

  generateJwtToken(payload: JwtPayload) {
    return this.jwtService.sign({
      id: payload.id,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    });
  }

  private generateOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP validity 10 minutes

    return { otp, otpExpiry };
  }

  private buildReferralCodeBase(name: string, email: string) {
    const source = name || email.split('@')[0] || 'user';
    const cleaned = source.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    return (cleaned || 'USER').slice(0, 6);
  }

  private generateReferralCodeCandidate(base: string) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const suffix = Array.from({ length: 4 }, () => {
      return alphabet[Math.floor(Math.random() * alphabet.length)];
    }).join('');

    return `${base}${suffix}`;
  }

  private async generateUniqueReferralCode(
    tx: Prisma.TransactionClient,
    name: string,
    email: string,
  ) {
    const base = this.buildReferralCodeBase(name, email);

    for (let attempt = 0; attempt < 20; attempt++) {
      const referralCode = this.generateReferralCodeCandidate(base);
      const existingUser = await tx.user.findUnique({
        where: { referralCode },
        select: { id: true },
      });

      if (!existingUser) {
        return referralCode;
      }
    }

    return `${base}${Date.now().toString(36).toUpperCase()}`;
  }

  generateSessionInfo(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];

    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || 'unknown';

    const userAgentRaw = req.headers['user-agent'] ?? 'unknown';
    const ua = userAgentRaw.toLowerCase();

    let deviceName = 'Desktop';

    if (ua.includes('ipad') || ua.includes('tablet')) {
      deviceName = 'Tablet';
    } else if (
      ua.includes('mobile') ||
      ua.includes('iphone') ||
      ua.includes('android')
    ) {
      deviceName = 'Mobile';
    }

    // OS detection
    let os = 'Unknown';

    if (ua.includes('windows nt')) {
      os = 'Windows';
    } else if (ua.includes('mac os x') || ua.includes('macintosh')) {
      os = 'macOS';
    } else if (ua.includes('android')) {
      os = 'Android';
    } else if (ua.includes('iphone') || ua.includes('ios')) {
      os = 'iOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    }

    const device = `${deviceName} (${os})`;

    return {
      ip,
      device,
      userAgent: userAgentRaw,
    };
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User already exist');
    }

    const { otp, otpExpiry } = this.generateOtp();

    const otpHash = await bcrypt.hash(otp, 10);

    const hashPassword = await bcrypt.hash(createUserDto.password, 10);
    const imageKey = createUserDto.imageKey?.trim() || '';

    if (imageKey && !imageKey.startsWith('auth/')) {
      throw new BadRequestException('Invalid image key');
    }

    await this.prisma.$transaction(async (tx) => {
      const ownReferralCode = await this.generateUniqueReferralCode(
        tx,
        createUserDto.name,
        createUserDto.email,
      );
      const referredByCode = createUserDto.referralCode?.trim().toUpperCase();

      const referrer = referredByCode
        ? await tx.user.findUnique({
            where: { referralCode: referredByCode },
            select: {
              id: true,
              email: true,
              isReferralEnabled: true,
            },
          })
        : null;

      if (referredByCode && !referrer) {
        throw new BadRequestException('Invalid referral code');
      }

      if (referrer?.email === createUserDto.email) {
        throw new BadRequestException('You cannot use your own referral code');
      }

      if (referrer && !referrer.isReferralEnabled) {
        throw new BadRequestException('Referral code is disabled');
      }

      const createdUser = await tx.user.create({
        data: {
          email: createUserDto.email,
          name: createUserDto.name,
          password: hashPassword,
          registrationTime: new Date(),
          imageKey: imageKey,
          imageUrl: null,
          referralCode: ownReferralCode,
        },
      });

      await tx.userCreditWallet.create({
        data: {
          userId: createdUser.id,
          earnedTaskCredits: 0,
          visibilityCredits: 0,
        },
      });

      if (referrer && referredByCode) {
        const referral = await tx.userReferral.create({
          data: {
            referrerUserId: referrer.id,
            referredUserId: createdUser.id,
            codeUsed: referredByCode,
          },
        });

        // Referral notification purpose: tell the referrer that a new user used their code.
        await createReferralNotificationIfAllowed(tx, {
          recipientId: referrer.id,
          actorId: createdUser.id,
          referralId: referral.id,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: 'New referral joined',
          body: `${createdUser.name} signed up using your referral code.`,
          idempotencyKey: `referral-joined-${referral.id}-${referrer.id}`,
          data: {
            stage: 'SIGNED_UP',
            referredUserId: createdUser.id,
            referredUserName: createdUser.name,
            referredUserEmail: createdUser.email,
            codeUsed: referredByCode,
          },
        });
      }

      // UserMatchingProfile is intentionally disabled until the marketplace algorithm rollout.

      // delete previous OTPs (important)
      await tx.otpToken.deleteMany({
        where: {
          email: createUserDto.email,
          type: 'EMAIL_VERIFICATION',
          usedAt: null,
        },
      });

      await tx.otpToken.create({
        data: {
          email: createUserDto.email,
          tokenHash: otpHash,
          expiresAt: otpExpiry,
          type: 'EMAIL_VERIFICATION',
        },
      });
    });

    // 🔥 send email async (DO NOT await)
    this.mail.sendVerificationEmail(createUserDto.email, {
      name: createUserDto.name,
      otp,
    });

    return sendResponse(
      'User registered. Check your email for verification OTP.',
    );
  }

  async verifyRegisterOtp(payload: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new ConflictException('User already verified');
    }

    const otpRecord = await this.prisma.otpToken.findFirst({
      where: {
        email: payload.email,
        type: 'EMAIL_VERIFICATION',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' }, // ✅ always latest OTP
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'OTP expired or not found, please request a new one',
      );
    }

    const isOtpValid = await bcrypt.compare(payload.otp, otpRecord.tokenHash);

    // 🔐 OPTIONAL: increment attempts
    if (!isOtpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // mark all OTPs as used (invalidate others)
      await tx.otpToken.updateMany({
        where: {
          email: payload.email,
          type: 'EMAIL_VERIFICATION',
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });

      const updatedUser = await tx.user.update({
        where: { email: payload.email },
        data: {
          isVerified: true,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      return updatedUser;
    });

    await this.userSubscriptionService.ensureDefaultFreeSubscription(result.id);

    return sendResponse('User Verified Successfully', {
      result,
    });
  }

  async login(payload: LoginDto, req: Request) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        password: true,
        isVerified: true,
        status: true,
        isDeleted: true,
        role: true,
      },
    });

    if (!isUserExist || isUserExist.isDeleted) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    if (!isUserExist.isVerified) {
      throw new UnauthorizedException(
        'User not verified, Please verify your account first.',
      );
    }

    if (isUserExist.status !== 'ACTIVE') {
      throw new BadRequestException('User is not active');
    }

    if (!isUserExist.password) {
      throw new BadRequestException(
        'This account does not support password login',
      );
    }

    const isPasswordMatch = await bcrypt.compare(
      payload.password,
      isUserExist.password,
    );

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const { ip, userAgent, device } = this.generateSessionInfo(req);

    const session = await this.prisma.session.create({
      data: {
        userId: isUserExist.id,
        ipAddress: ip,
        userAgent,
        device,
        loginAt: new Date(),
      },
    });

    const accessToken = this.generateJwtToken({
      id: isUserExist.id,
      email: isUserExist.email,
      role: isUserExist.role,
      sessionId: session.id,
    });

    return sendResponse('User logged in successfully', { accessToken });
  }
  
    async adminLogin(payload: LoginDto, req: Request) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        password: true,
        isVerified: true,
        status: true,
        isDeleted: true,
        role: true,
      },
    });

    // Use generic error to avoid leaking whether the account exists or not
    if (!isUserExist || isUserExist.isDeleted) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    // Only ADMIN accounts are allowed to access the admin portal
    if (
      isUserExist.role !== UserRole.ADMIN &&
      isUserExist.role !== UserRole.SUPER_ADMIN
    ) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    if (!isUserExist.isVerified) {
      throw new UnauthorizedException(
        'User not verified, Please verify your account first.',
      );
    }

    if (isUserExist.status !== 'ACTIVE') {
      throw new BadRequestException('User is not active');
    }

    if (!isUserExist.password) {
      throw new BadRequestException(
        'This account does not support password login',
      );
    }

    const isPasswordMatch = await bcrypt.compare(
      payload.password,
      isUserExist.password,
    );

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const { ip, userAgent, device } = this.generateSessionInfo(req);

    const session = await this.prisma.session.create({
      data: {
        userId: isUserExist.id,
        ipAddress: ip,
        userAgent,
        device,
        loginAt: new Date(),
      },
    });

    const accessToken = this.generateJwtToken({
      id: isUserExist.id,
      email: isUserExist.email,
      role: isUserExist.role,
      sessionId: session.id,
    });

    return sendResponse('Admin logged in successfully', { accessToken });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: {
        password: true,
        isDeleted: true,
        isVerified: true,
        registrationTime: true,
        createdAt: true,
        updatedAt: true,
        punishmentReason: true,
        suspendStart: true,
        suspendEnd: true,
      },
      include: {
        sessions: {
          where: { logoutAt: null },
          select: {
            id: true,
            ipAddress: true,
            device: true,
            userAgent: true,
            loginAt: true,
            logoutAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('User is not active');
    }

    if (user.role === UserRole.USER) {
      await this.userSubscriptionService.ensureDefaultFreeSubscription(user.id);
    }

    const signedImageUrl = await this.s3.resolveFileUrl(
      user.imageKey ?? user.imageUrl,
    );

    const authorization =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN
        ? await this.adminAuthorizationService.buildAuthorizationForUser(
            user.id,
            user.role,
          )
        : null;

    return sendResponse('User Information Fetched Successfully', {
      ...user,
      imageUrl: signedImageUrl,
      ...(authorization ? { authorization } : {}),
    });
  }

  async getStatics(id: string) {
    const result = await this.prisma.user.findUnique({
      where: { id },
      select: {
        lastPasswordChangeTime: true,
        registrationTime: true,
        sessions: {
          select: {
            id: true,
            ipAddress: true,
            device: true,
            userAgent: true,
            loginAt: true,
            logoutAt: true,
          },
        },
      },
    });

    return sendResponse('Profile Information Fetched Successfully', result);
  }

  async createUserWithoutOtp(
    createUserByAdmin: CreateUserByAdminDto,
    actorRole?: string,
  ) {
    if (createUserByAdmin.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'Super admin accounts cannot be created from this endpoint',
      );
    }

    if (
      createUserByAdmin.role === UserRole.ADMIN &&
      actorRole !== UserRole.SUPER_ADMIN
    ) {
      throw new UnauthorizedException('Only super admins can create admins');
    }

    const isUserAlreadyExist = await this.prisma.user.findUnique({
      where: { email: createUserByAdmin.email },
    });

    if (isUserAlreadyExist) {
      throw new ConflictException('User already exist');
    }

    const hashPassword = await bcrypt.hash(createUserByAdmin.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const referralCode = await this.generateUniqueReferralCode(
        tx,
        createUserByAdmin.name,
        createUserByAdmin.email,
      );

      const createdUser = await tx.user.create({
        data: {
          name: createUserByAdmin.name,
          email: createUserByAdmin.email,
          password: hashPassword,
          role: createUserByAdmin.role,
          isVerified: true,
          registrationTime: new Date(),
          status: 'ACTIVE',
          referralCode,
        },
      });

      await tx.userCreditWallet.create({
        data: {
          userId: createdUser.id,
          earnedTaskCredits: 0,
          visibilityCredits: 0,
        },
      });

      // UserMatchingProfile is intentionally disabled until the marketplace algorithm rollout.

      return createdUser;
    });

    const { password: passwordHashToExclude, ...safeUser } = result;
    void passwordHashToExclude;

    return sendResponse('User Registration Successfully, User can login now.', {
      result: safeUser,
    });
  }

  async resendRegistrationVerifyOtp(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        isVerified: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new ConflictException('User already verified');
    }

    const now = new Date();

    const lastOtp = await this.prisma.otpToken.findFirst({
      where: {
        email,
        type: 'EMAIL_VERIFICATION',
      },
      orderBy: { createdAt: 'desc' },
    });

    // 🚫 Cooldown (60 sec)
    if (lastOtp && now.getTime() - lastOtp.createdAt.getTime() < 60 * 1000) {
      throw new BadRequestException(
        'Please wait before requesting another OTP',
      );
    }

    const { otp, otpExpiry } = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.otpToken.deleteMany({
        where: {
          email,
          type: 'EMAIL_VERIFICATION',
          usedAt: null,
        },
      });

      await tx.otpToken.create({
        data: {
          email,
          tokenHash: otpHash,
          expiresAt: otpExpiry,
          type: 'EMAIL_VERIFICATION',
        },
      });
    });

    // 🔥 async email (non-blocking)
    this.mail.sendVerificationEmail(email, {
      name: user.name,
      otp,
    });

    return sendResponse(
      'Verification OTP resent successfully. Check your email.',
    );
  }

  async logOut(userId: string, sessionId: string) {
    const result = await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
        logoutAt: null,
      },
      data: {
        logoutAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Session not found');
    }

    this.messagingGateway.disconnectSession(sessionId, 'Logged out');

    return sendResponse('Logged out successfully');
  }

  async logOutAllDevices(userId: string) {
    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId,
        logoutAt: null,
      },
      select: {
        id: true,
      },
    });

    if (activeSessions.length === 0) {
      throw new NotFoundException('No active sessions found');
    }

    await this.prisma.session.updateMany({
      where: {
        userId,
        logoutAt: null,
      },
      data: {
        logoutAt: new Date(),
      },
    });

    for (const session of activeSessions) {
      this.messagingGateway.disconnectSession(
        session.id,
        'Logged out from all devices',
      );
    }

    return sendResponse('Logged out from all devices successfully');
  }

  async logOutSession(userId: string, sessionId: string) {
    const result = await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
        logoutAt: null,
      },
      data: {
        logoutAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Session not found');
    }

    this.messagingGateway.disconnectSession(sessionId, 'Logged out');

    return sendResponse('Session logged out successfully');
  }

  async getSessions(userId: string) {
    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId,
        logoutAt: null,
      },
      select: {
        id: true,
        ipAddress: true,
        device: true,
        loginAt: true,
        userAgent: true,
      },
      orderBy: {
        loginAt: 'desc',
      },
    });

    const previousSessions = await this.prisma.session.findMany({
      where: {
        userId,
        logoutAt: { not: null },
      },
      select: {
        id: true,
        ipAddress: true,
        device: true,
        loginAt: true,
        userAgent: true,
      },
      orderBy: {
        logoutAt: 'desc',
      },
      take: 10, // 🔥 latest 10 previous sessions
    });

    return sendResponse('Sessions Fetched Successfully', {
      activeSessions,
      previousSessions,
    });
  }
}
