import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from 'src/redis/redis.module';
import { RedisService } from 'src/redis/redis.service';
import { BULLMQ_DEFAULT_JOB_OPTIONS } from './constants/default-job-options.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService, RedisService],
      useFactory: (
        configService: ConfigService,
        redisService: RedisService,
      ) => {
        const rawPrefix = configService.get<string>('BULLMQ_PREFIX', 'backlyst');
        const prefix =
          rawPrefix.startsWith('{') && rawPrefix.endsWith('}')
            ? rawPrefix
            : `{${rawPrefix}}`;
        return {
          connection: redisService.getBullMQConnection(),
          prefix,
          defaultJobOptions: BULLMQ_DEFAULT_JOB_OPTIONS,
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class BullMQModule {}
