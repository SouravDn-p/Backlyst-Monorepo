import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MessagingGateway } from './messaging.gateway';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { JwtService } from '@nestjs/jwt';
import { UploadFileModule } from 'src/common/upload-file/upload-file.module';
import { ConfigModule } from '@nestjs/config';
import { QUEUE_NAMES } from 'src/bullmq/constants/queue.constants';
import { MessagingProducer } from './messaging.producer';
import { MessagingWorker } from './messaging.worker';
import { MessagingPubSubService } from './messaging-pubsub.service';
import { MessageRegistryService } from './message-registry.service';
import { PlatformFeatureToggleModule } from '../admin/platform-feature-toggle/platform-feature-toggle.module';

@Module({
  imports: [
    PrismaModule,
    UploadFileModule,
    ConfigModule,
    PlatformFeatureToggleModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.MESSAGING,
    }),
  ],
  providers: [
    MessagingGateway,
    MessagingService,
    MessageRegistryService,
    MessagingPubSubService,
    MessagingProducer,
    MessagingWorker,
    JwtService,
  ],
  controllers: [MessagingController],
  exports: [
    MessagingGateway,
    MessagingProducer,
    MessagingPubSubService,
    MessageRegistryService,
  ],
})
export class MessagingModule {}
