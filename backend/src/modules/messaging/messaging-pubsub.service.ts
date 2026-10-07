import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  MessageRealtimeShape,
  MessagingRealtimeEvent,
} from './message.interface';

@Injectable()
export class MessagingPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingPubSubService.name);
  private readonly channel = 'messaging:events';
  private readonly handlers: Array<
    (event: MessagingRealtimeEvent) => void | Promise<void>
  > = [];
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    const isAwsCache = redisUrl.includes('cache.amazonaws.com') || redisUrl.startsWith('rediss://');
    const options = isAwsCache ? { tls: { rejectUnauthorized: false } } : {};

    this.publisher = new Redis(redisUrl, options);
    this.subscriber = new Redis(redisUrl, options);
    this.attachRedisListeners(this.publisher, 'Messaging publisher');
    this.attachRedisListeners(this.subscriber, 'Messaging subscriber');
  }

  private attachRedisListeners(client: Redis, name: string) {
    client.on('connect', () => {
      this.logger.log(`${name} Redis connected`);
    });

    client.on('ready', () => {
      this.logger.log(`${name} Redis ready`);
    });

    client.on('reconnecting', () => {
      this.logger.warn(`${name} Redis reconnecting`);
    });

    client.on('end', () => {
      this.logger.warn(`${name} Redis connection ended`);
    });

    client.on('error', (error) => {
      this.logger.error(
        `${name} Redis error`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  async onModuleInit() {
    // Pub/Sub is for realtime fanout, not durable message storage.
    await this.subscriber.subscribe(this.channel);

    this.subscriber.on('message', (channel, payload) => {
      void this.handleSubscriberMessage(channel, payload);
    });
  }

  private async handleSubscriberMessage(channel: string, payload: string) {
    if (channel !== this.channel) {
      return;
    }

    let event: MessagingRealtimeEvent;
    try {
      event = JSON.parse(payload) as MessagingRealtimeEvent;
    } catch (error) {
      this.logger.error(
        'Failed to parse messaging pubsub event payload',
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          'Failed to process messaging pubsub event',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  onEvent(handler: (event: MessagingRealtimeEvent) => void | Promise<void>) {
    this.handlers.push(handler);
  }

  async publish(event: MessagingRealtimeEvent) {
    try {
      await this.publisher.publish(this.channel, JSON.stringify(event));
    } catch (error) {
      this.logger.error(
        'Failed to publish messaging event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async publishMessageCreated(
    message: MessageRealtimeShape & { [key: string]: unknown },
  ) {
    await this.publish({
      event: 'message.created',
      senderId: message.senderId,
      recipientId: message.recipientId,
      taskId: message.taskId ?? null,
      message,
    });
  }

  async publishMessageDeleted(message: MessageRealtimeShape) {
    await this.publish({
      event: 'message.deleted',
      senderId: message.senderId,
      recipientId: message.recipientId,
      taskId: message.taskId ?? null,
      messageId: message.id,
    });
  }

  async publishMessageRegistryUpdated(message: MessageRealtimeShape) {
    if (!message.registryStatus) {
      return;
    }

    await this.publish({
      event: 'message.registry_updated',
      senderId: message.senderId,
      recipientId: message.recipientId,
      taskId: message.taskId ?? null,
      messageId: message.id,
      registryStatus: message.registryStatus,
    });
  }

  async publishMessageReported(
    message: MessageRealtimeShape,
    report: { id: string },
  ) {
    await this.publish({
      event: 'message.reported',
      senderId: message.senderId,
      recipientId: message.recipientId,
      taskId: message.taskId ?? null,
      messageId: message.id,
      reportId: report.id,
    });
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}
