import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Patch,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserByAdminDto, CreateUserDto } from './dto/create-user.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { ResendRegistrationVerifyOtpDto } from './dto/resendRegistrationVerifyOtp.dto';
import {
  ChangePasswordDto,
  VerifyForgottenPasswordOtpDto,
} from './dto/change-password.dto';
import { ForgottenPasswordDto } from './dto/forgotten-password.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PasswordService } from './password.service';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthService } from './google-auth.service';
import { ConfigService } from '@nestjs/config';
import { TempPasswordResetDto } from './dto/temp-password-reset.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordService: PasswordService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register user',
    description:
      'Creates a new user and sends an OTP to the provided email address.',
    security: [],
  })
  async create(@Body() payload: CreateUserDto) {
    return this.authService.create(payload);
  }

  @Post('/verify-register-otp')
  @ApiOperation({
    summary: 'Verify registration OTP',
    description:
      'Verifies the OTP sent to the user email and returns an access token for authentication.',
    security: [],
  })
  verifyRegisterOtp(@Body() payload: VerifyOtpDto) {
    return this.authService.verifyRegisterOtp(payload);
  }

  @Post('/login')
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticates the user using email and password, and returns an access token.',
    security: [],
  })
  login(@Body() payload: LoginDto, @Req() req: Request) {
    return this.authService.login(payload, req);
  }

  @Post('/admin-login')
  @ApiOperation({
    summary: 'Login admin',
    description:
      'Authenticates an admin user using email and password. Only accounts with the ADMIN role are accepted.',
    security: [],
  })
  adminLogin(@Body() payload: LoginDto, @Req() req: Request) {
    return this.authService.adminLogin(payload, req);
  }

  @UserGuard()
  @Get('me')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Get current user',
    description:
      'Returns the authenticated user information using the access token.',
  })
  me(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @UserGuard()
  @Get('dashboard-statics')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Returns user-related timestamps including registration time, last login time, and last password change time.',
  })
  dashboardStatics(@CurrentUser('id') userId: string) {
    return this.authService.getStatics(userId);
  }

  @AdminGuard()
  @Post('admin-create-user')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Admin create user',
    description:
      'Creates a new user directly by an admin without OTP verification.',
  })
  adminCreateUser(
    @Body() payload: CreateUserByAdminDto,
    @CurrentUser('role') actorRole: string,
  ) {
    return this.authService.createUserWithoutOtp(payload, actorRole);
  }

  @Post('/resend-register-otp')
  @ApiOperation({
    summary: 'Resend registration OTP',
    description:
      'Resends a new OTP to the user email for completing registration verification.',
    security: [],
  })
  resendRegistrationVerifyOtp(@Body() payload: ResendRegistrationVerifyOtpDto) {
    return this.authService.resendRegistrationVerifyOtp(payload.email);
  }

  @UserGuard()
  @Patch('/change-password')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Change password',
    description:
      'Allows an authenticated user to change their password using the current access token.',
  })
  changePassword(
    @Body() payload: ChangePasswordDto,
    @CurrentUser('email') email: string,
  ) {
    return this.passwordService.changePassword(payload, email);
  }

  @Post('/forgotten-password')
  @ApiOperation({
    summary: 'Step 1 - Request password reset OTP',
    description: `
  Initiates the password reset process.

  Flow:
    1. User submits email
    2. System generates OTP
    3. OTP is sent to user email
    4. OTP is valid for 10 minutes
  `,
    security: [],
  })
  forgottenPassword(@Body() payload: ForgottenPasswordDto) {
    return this.passwordService.forgottenPassword(payload.email);
  }

  @Post('/verify-forgotten-password-otp')
  @ApiOperation({
    summary: 'Step 2 - Verify OTP and reset password',
    description: `
      Completes password reset process.

Flow:
1. User submits email + OTP + new password
2. System verifies OTP and expiry
3. If valid → password is updated
4. OTP is cleared from database

Result:
- Password is successfully changed
- User can now login with new password
  `,
    security: [],
  })
  verifyForgottenPasswordOtp(@Body() payload: VerifyForgottenPasswordOtpDto) {
    return this.passwordService.verifyForgottenPasswordOtp(payload);
  }

  @Post('/temp-password-reset')
  @ApiOperation({
    summary: 'Temporary password reset recovery endpoint',
    description:
      'Temporary recovery endpoint for non-production/emergency use. Requires x-temp-password-reset-secret header. No access token or old password is required.',
    security: [],
  })
  tempPasswordReset(
    @Body() payload: TempPasswordResetDto,
    @Headers('x-temp-password-reset-secret') secret?: string,
  ) {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException(
        'Temporary password reset is disabled in production',
      );
    }

    const configuredSecret = this.config.get<string>(
      'TEMP_PASSWORD_RESET_SECRET',
    );

    if (!configuredSecret) {
      throw new BadRequestException(
        'TEMP_PASSWORD_RESET_SECRET is not configured',
      );
    }

    if (!secret || secret !== configuredSecret) {
      throw new ForbiddenException('Invalid temporary password reset secret');
    }

    return this.passwordService.tempResetPassword(payload);
  }

  @UserGuard()
  @Post('/logout')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logs out the authenticated user by invalidating the current session.',
  })
  logOut(
    @CurrentUser('id') userId: string,
    @CurrentUser('sessionId') sessionId: string,
  ) {
    return this.authService.logOut(userId, sessionId);
  }

  @UserGuard()
  @Post('/logout-all')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Logout from all devices',
    description:
      'Logs out the authenticated user from all active sessions/devices.',
  })
  logOutAllDevices(@CurrentUser('id') userId: string) {
    return this.authService.logOutAllDevices(userId);
  }

  @UserGuard()
  @Get('/sessions')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Get user sessions',
    description:
      'Returns the list of sessions associated with the authenticated user.',
  })
  getSessions(@CurrentUser('id') userId: string) {
    return this.authService.getSessions(userId);
  }

  @UserGuard()
  @Delete('/sessions/:sessionId')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Logout a specific session',
    description:
      'Logs out a specific session belonging to the authenticated user.',
  })
  logOutSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.logOutSession(userId, sessionId);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const accessToken = await this.googleAuthService.googleLogin(
      req.user as any,
      req,
    );

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');

    return res.redirect(`${frontendUrl}/auth/success?token=${accessToken}`);
  }
}
