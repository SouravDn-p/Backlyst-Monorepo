import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type JobsOptions, Queue } from 'bullmq';
import { QUEUE_NAMES } from 'src/bullmq/constants/queue.constants';

@Injectable()
export class AuthProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.AUTH)
    private readonly authQueue: Queue,
  ) {}

  async enqueue(
    jobName: string,
    payload: Record<string, unknown> = {},
    options?: JobsOptions,
  ) {
    return this.authQueue.add(jobName, payload, options);
  }
}
