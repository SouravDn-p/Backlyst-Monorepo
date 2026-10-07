import { Module } from '@nestjs/common';
import { WebsiteVerificationService } from './website-verification.service';
import { WebsiteVerificationController } from './website-verification.controller';
import { WebsiteVerificationMetaService } from './website-verification-meta.service';
import { WebsiteVerificationDnsService } from './website-verification-dns.service';
import { ReferrerModule } from 'src/modules/credit/referrer/referrer.module';
import { NotificationModule } from 'src/modules/notification/notification.module';

@Module({
  imports: [ReferrerModule, NotificationModule],
  controllers: [WebsiteVerificationController],
  providers: [
    WebsiteVerificationService,
    WebsiteVerificationMetaService,
    WebsiteVerificationDnsService,
  ],
})
export class WebsiteVerificationModule {}
