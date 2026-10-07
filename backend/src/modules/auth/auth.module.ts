import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';
import { QUEUE_NAMES } from 'src/bullmq/constants/queue.constants';
import { AuthProducer } from './auth.producer';
import { AuthWorker } from './auth.worker';
import { MessagingModule } from 'src/modules/messaging/messaging.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthService } from './google-auth.service';
import { AdminAuthorizationModule } from '../admin/admin-authorization/admin-authorization.module';
import { UserSubscriptionModule } from '../subscription/user-subscription/user-subscription.module';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PasswordService,
    AuthProducer,
    AuthWorker,
    GoogleStrategy,
    GoogleAuthService,
  ],
  imports: [
    PassportModule,
    MessagingModule,
    AdminAuthorizationModule,
    UserSubscriptionModule,
    ConfigModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.AUTH,
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');

        return {
          secret,
          signOptions: {
            expiresIn: '10d',
          },
        };
      },
    }),
  ],
})
export class AuthModule {}
