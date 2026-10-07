import { AdminSubscriptionPlanModule } from './modules/subscription-plan/admin-subscription-plan/admin-subscription-plan.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { CacheModule } from './cache/cache.module';
import { RedisModule } from './redis/redis.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagingModule } from './modules/messaging/messaging.module';
import { WebsiteModule } from './modules/website/website.module';
import { AuthModule } from './modules/auth/auth.module';
import { UploadFileModule } from './common/upload-file/upload-file.module';
import { MailModule } from './common/utils/mail/mail.module';
import { AdminUserModule } from './modules/user/admin-user/admin-user.module';
import { BullMQModule } from './bullmq/bullmq.module';
import { TaskModule } from './modules/task/task.module';
import { AdminTaskModule } from './modules/task/admin-task/admin-task.module';
import { TaskRequesterModule } from './modules/task/task-requester/task-requester.module';
import { ProviderTaskModule } from './modules/task/provider-task/provider-task.module';
import { DirectTaskRequestModule } from './modules/task/direct-task-request/direct-task-request.module';
import { ScheduleModule } from '@nestjs/schedule';

import { SubscriptionPlanModule } from './modules/subscription-plan/subscription-plan.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { WebsiteVerificationModule } from './modules/website/website-verification/website-verification.module';
import { WebsiteVerificationAdminModule } from './modules/website/website-verification/website-verification-admin/website-verification-admin.module';
import { LegalDocModule } from './modules/legal-doc/legal-doc.module';
import { UploadS3Module } from './modules/upload-s3/upload-s3.module';
import { PublisherModule } from './modules/publisher/publisher.module';
import { CreditModule } from './modules/credit/credit.module';
import { ProviderDashboardModule } from './modules/provider-dashboard/provider-dashboard.module';
import { RequesterDashboardModule } from './modules/requester-dashboard/requester-dashboard.module';
import { StripeWebhookModule } from './modules/stripe-webhook/stripe-webhook.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationModule } from './modules/notification/notification.module';
import { TaskNotificationModule } from './modules/task-notification/task-notification.module';

import { CompanyModule } from './modules/company/company.module';
import { BlogModule } from './modules/blog/blog.module';
import { ContactModule } from './modules/contact/contact.module';
import { SeedModule } from './modules/seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    BullMQModule,
    CacheModule,
    UserModule,
    MessagingModule,
    AuthModule,
    UploadFileModule,
    WebsiteModule,
    MailModule,
    AdminUserModule,
    TaskModule,
    AdminTaskModule,
    TaskRequesterModule,
    ProviderTaskModule,
    DirectTaskRequestModule,
    AdminSubscriptionPlanModule,
    SubscriptionPlanModule,
    SubscriptionModule,
    WebsiteVerificationModule,
    WebsiteVerificationAdminModule,
    LegalDocModule,
    UploadS3Module,
    CreditModule,
    StripeWebhookModule,
    PublisherModule,
    CompanyModule,
    ProviderDashboardModule,
    RequesterDashboardModule,
    AdminModule,
    NotificationModule,
    TaskNotificationModule,
    BlogModule,
    ContactModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
