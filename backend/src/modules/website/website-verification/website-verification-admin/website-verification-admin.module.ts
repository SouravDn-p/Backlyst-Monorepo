import { Module } from '@nestjs/common';
import { WebsiteVerificationAdminService } from './website-verification-admin.service';
import { WebsiteVerificationAdminController } from './website-verification-admin.controller';
import { ReferrerModule } from 'src/modules/credit/referrer/referrer.module';
import { NotificationModule } from 'src/modules/notification/notification.module';

@Module({
  imports: [ReferrerModule, NotificationModule],
  controllers: [WebsiteVerificationAdminController],
  providers: [WebsiteVerificationAdminService],
})
export class WebsiteVerificationAdminModule {}
