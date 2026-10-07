import { Module } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { AdminUserController } from './admin-user.controller';
import { MessagingModule } from 'src/modules/messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  controllers: [AdminUserController],
  providers: [AdminUserService],
})
export class AdminUserModule {}
