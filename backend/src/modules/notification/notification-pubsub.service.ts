import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type NotificationRealtimeEvent =
  | {
      event: 'notification.created';
      recipientId: string;
      audience: 'USER' | 'ADMIN';
      notificationId: string;
      notification: unknown;
      unreadCount: number;
    }
  | {
      event: 'notification.read';
      recipientId: string;
      audience: 'USER' | 'ADMIN';
      notificationId: string;
      unreadCount: number;
    }
  | {
      event: 'notification.read_all';
      recipientId: string;
      audience: 'USER' | 'ADMIN';
      updatedCount: number;
      unreadCount: number;
    };

@Injectable()
export class NotificationPubSubService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationPubSubService.name);
  private readonly channel = 'notification:events';
  private readonly handlers: Array<
    (event: NotificationRealtimeEvent) => void | Promise<void>
  > = [];
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    const isAwsCache = redisUrl.includes('cache.amazonaws.com') || redisUrl.startsWith('rediss://');
    const options = isAwsCache ? { tls: { rejectUnauthorized: false } } : {};

    this.publisher = new Redis(redisUrl, options);
    this.subscriber = new Redis(redisUrl, options);
    this.attachRedisListeners(this.publisher, 'Notification publisher');
    this.attachRedisListeners(this.subscriber, 'Notification subscriber');
  }

  private attachRedisListeners(client: Redis, name: string) {
    client.on('connect', () => this.logger.log(`${name} Redis connected`));
    client.on('ready', () => this.logger.log(`${name} Redis ready`));
    client.on('reconnecting', () =>
      this.logger.warn(`${name} Redis reconnecting`),
    );
    client.on('end', () => this.logger.warn(`${name} Redis connection ended`));
    client.on('error', (error) => {
      this.logger.error(
        `${name} Redis error`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  async onModuleInit() {
    // Pub/Sub distributes realtime fanout across app instances; it is not durable storage.
    await this.subscriber.subscribe(this.channel);
    this.subscriber.on('message', (channel, payload) => {
      void this.handleSubscriberMessage(channel, payload);
    });
  }

  private async handleSubscriberMessage(channel: string, payload: string) {
    if (channel !== this.channel) return;

    let event: NotificationRealtimeEvent;
    try {
      event = JSON.parse(payload) as NotificationRealtimeEvent;
    } catch (error) {
      this.logger.error(
        'Failed to parse notification pubsub event payload',
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          'Failed to process notification pubsub event',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  onEvent(handler: (event: NotificationRealtimeEvent) => void | Promise<void>) {
    this.handlers.push(handler);
  }

  async publish(event: NotificationRealtimeEvent) {
    try {
      await this.publisher.publish(this.channel, JSON.stringify(event));
    } catch (error) {
      this.logger.error(
        'Failed to publish notification event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}
