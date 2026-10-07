import { Module } from '@nestjs/common';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { TaskNotificationService } from './task-notification.service';

@Module({
  imports: [NotificationModule],
  providers: [TaskNotificationService],
  exports: [TaskNotificationService],
})
export class TaskNotificationModule {}
