import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { QUEUE_NAMES } from 'src/bullmq/constants/queue.constants';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminNotificationController } from './admin-notification.controller';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationProcessor } from './notification.processor';
import { NotificationPubSubService } from './notification-pubsub.service';
import { NotificationService } from './notification.service';
import { NotificationMetricsService } from './notification-metrics.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATION }),
  ],
  controllers: [NotificationController, AdminNotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    NotificationProcessor,
    NotificationPubSubService,
    NotificationMetricsService,
    JwtService,
  ],
  exports: [
    NotificationService,
    NotificationGateway,
    NotificationPubSubService,
    NotificationMetricsService,
  ],
})
export class NotificationModule {}
