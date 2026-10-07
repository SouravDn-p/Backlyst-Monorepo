import { Module } from '@nestjs/common';
import { AdminManualMatchQueueController } from './manual-match-queue.controller';
import { ManualMatchQueueService } from './manual-match-queue.service';

@Module({
  controllers: [AdminManualMatchQueueController],
  providers: [ManualMatchQueueService],
  exports: [ManualMatchQueueService],
})
export class AdminManualMatchQueueModule {}
