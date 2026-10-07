import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { NotificationModule } from '../notification/notification.module';
import { MailModule } from '../../common/utils/mail/mail.module';

@Module({
  imports: [NotificationModule, MailModule],
  controllers: [ContactController],
  providers: [ContactService]
})
export class ContactModule {}
