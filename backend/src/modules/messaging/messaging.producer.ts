import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type JobsOptions, Queue } from 'bullmq';
import {
  MESSAGING_QUEUE_JOB_NAMES,
  QUEUE_NAMES,
} from 'src/bullmq/constants/queue.constants';
import { CreateMessageJobData } from './message.interface';

@Injectable()
export class MessagingProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.MESSAGING)
    private readonly messagingQueue: Queue,
  ) {}

  async enqueueCreateMessage(
    payload: CreateMessageJobData,
    options?: JobsOptions,
  ) {
    return this.messagingQueue.add(
      MESSAGING_QUEUE_JOB_NAMES.CREATE_MESSAGE,
      payload,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 24 * 3600,
          count: 5000,
        },
        ...options,
      },
    );
  }
}
