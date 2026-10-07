import { Module } from '@nestjs/common';
import { AdminMarketplaceVisibilityController } from './admin-marketplace-visibility.controller';
import { AdminMarketplaceVisibilityService } from './admin-marketplace-visibility.service';

@Module({
  controllers: [AdminMarketplaceVisibilityController],
  providers: [AdminMarketplaceVisibilityService],
})
export class AdminMarketplaceVisibilityModule {}
