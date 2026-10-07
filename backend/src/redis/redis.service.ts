import { ConfigService } from '@nestjs/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis, { type RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  private buildConnectionOptions(): RedisOptions {
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    const parsed = new URL(redisUrl);

    const dbFromPath =
      parsed.pathname && parsed.pathname !== '/'
        ? Number.parseInt(parsed.pathname.slice(1), 10)
        : undefined;
    const db =
      typeof dbFromPath === 'number' && !Number.isNaN(dbFromPath)
        ? dbFromPath
        : undefined;

    const connectionOptions: RedisOptions = {
      host: parsed.hostname,
      port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db,
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
    };

    const isAwsCache = parsed.hostname.includes('cache.amazonaws.com');
    if (parsed.protocol === 'rediss:' || isAwsCache) {
      connectionOptions.tls = {
        rejectUnauthorized: false,
      };
    }

    return connectionOptions;
  }

  onModuleInit() {
    this.client = new Redis(this.buildConnectionOptions());

    this.client.on('connect', () => {
      console.log('Redis client connected');
    });

    this.client.on('error', (err) => {
      console.error('Redis error', err);
    });
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  getBullMQConnection(): RedisOptions {
    return this.buildConnectionOptions();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      console.log('Redis client disconnected');
      this.client = null;
    }
  }
}
