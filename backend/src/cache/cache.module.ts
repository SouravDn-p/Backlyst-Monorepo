import { Module, Global } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { CacheUtil } from './redis-cache.util';

@Global()
@Module({
  imports: [RedisModule],
  providers: [CacheUtil],
  exports: [CacheUtil],
})
export class CacheModule {}
