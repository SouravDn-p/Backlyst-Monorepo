import { Module } from '@nestjs/common';
import { AdminAuthorizationController } from './admin-authorization.controller';
import { AdminAuthorizationService } from './admin-authorization.service';

@Module({
  controllers: [AdminAuthorizationController],
  providers: [AdminAuthorizationService],
  exports: [AdminAuthorizationService],
})
export class AdminAuthorizationModule {}
