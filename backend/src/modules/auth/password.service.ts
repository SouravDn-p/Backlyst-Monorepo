import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ChangePasswordDto,
  VerifyForgottenPasswordOtpDto,
} from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { sendResponse } from 'src/utils/sendResponse';
import { MailService } from 'src/common/utils/mail/mail.service';
import { SetPasswordDto } from './dto/set-password.dto';
import { TempPasswordResetDto } from './dto/temp-password-reset.dto';

@Injectable()
export class PasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private generateOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP validity 10 minutes

    return { otp, otpExpiry };
  }

  async changePassword(payload: ChangePasswordDto, email: string) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
      },
    });

    if (!isUserExist) {
      throw new NotFoundException('User not found');
    }

    // Google-only / OAuth-only account
    if (!isUserExist.password) {
      throw new BadRequestException(
        'This account does not support password authentication',
      );
    }

    const isPasswordMatch = await bcrypt.compare(
      payload.oldPassword,
      isUserExist.password,
    );

    if (!isPasswordMatch) {
      throw new BadRequestException('Invalid Password');
    }

    if (payload.oldPassword === payload.newPassword) {
      throw new BadRequestException(
        'New password cannot be same as old password',
      );
    }

    const hashPassword = await bcrypt.hash(payload.newPassword, 10);

    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashPassword,
        lastPasswordChangeTime: new Date(),
      },
    });

    return sendResponse('Password changed successfully');
  }

  async forgottenPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { name: true },
    });

    const now = new Date();

    const lastOtp = await this.prisma.otpToken.findFirst({
      where: {
        email,
        type: 'PASSWORD_RESET',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastOtp && now.getTime() - lastOtp.createdAt.getTime() < 60 * 1000) {
      throw new BadRequestException(
        'Please wait before requesting another OTP',
      );
    }

    if (user) {
      const { otp, otpExpiry } = this.generateOtp();
      const otpHash = await bcrypt.hash(otp, 10);

      await this.prisma.$transaction(async (tx) => {
        await tx.otpToken.deleteMany({
          where: {
            email,
            type: 'PASSWORD_RESET',
            usedAt: null,
          },
        });

        await tx.otpToken.create({
          data: {
            email,
            tokenHash: otpHash,
            type: 'PASSWORD_RESET',
            expiresAt: otpExpiry,
          },
        });
      });

      // async / queue preferred
      this.mail.sendPasswordResetEmail(email, {
        name: user.name,
        otp,
      });
    }

    return sendResponse(
      'Check your email to reset your password, You have 10 minutes to verify. If you did not receive the email, please check your spam folder.',
    );
  }

  async verifyForgottenPasswordOtp(payload: VerifyForgottenPasswordOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: payload.email,
      },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // prevent reusing same password
    if (user.password) {
      const isSame = await bcrypt.compare(payload.newPassword, user.password);

      if (isSame) {
        throw new BadRequestException(
          'New password cannot be same as old password',
        );
      }
    }

    const otpRecord = await this.prisma.otpToken.findFirst({
      where: {
        email: payload.email,
        type: 'PASSWORD_RESET',
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'OTP expired or invalid. Please request a new one.',
      );
    }

    const isOtpValid = await bcrypt.compare(payload.otp, otpRecord.tokenHash);

    if (!isOtpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    const hashPassword = await bcrypt.hash(payload.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      // invalidate otp(s)
      await tx.otpToken.updateMany({
        where: {
          email: payload.email,
          type: 'PASSWORD_RESET',
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      // update password
      await tx.user.update({
        where: {
          email: payload.email,
        },
        data: {
          password: hashPassword,
          lastPasswordChangeTime: new Date(),
        },
      });

      // logout all active sessions
      await tx.session.updateMany({
        where: {
          userId: user.id,
          logoutAt: null,
        },
        data: {
          logoutAt: new Date(),
        },
      });
    });

    return sendResponse('Password changed successfully');
  }

  // TODO need to refractor
  async setPassword(userId: string, payload: SetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // already has password
    if (user.password) {
      throw new BadRequestException('Password already exists');
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        lastPasswordChangeTime: new Date(),
      },
    });

    return sendResponse('Password set successfully');
  }

  async tempResetPassword(payload: TempPasswordResetDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        password: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    if (user.password) {
      const isSame = await bcrypt.compare(payload.newPassword, user.password);
      if (isSame) {
        throw new BadRequestException(
          'New password cannot be same as old password',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(payload.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: payload.email },
        data: {
          password: hashedPassword,
          lastPasswordChangeTime: new Date(),
        },
      });

      await tx.session.updateMany({
        where: {
          userId: user.id,
          logoutAt: null,
        },
        data: {
          logoutAt: new Date(),
        },
      });
    });

    return sendResponse('Temporary password reset completed successfully');
  }
}
