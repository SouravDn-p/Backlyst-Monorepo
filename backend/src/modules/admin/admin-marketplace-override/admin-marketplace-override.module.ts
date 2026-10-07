import { Module } from '@nestjs/common';
import { AdminMarketplaceOverrideController } from './admin-marketplace-override.controller';
import { MarketplaceOverrideService } from 'src/modules/task/market-algoritm/marketplace-override.service';

@Module({
  controllers: [AdminMarketplaceOverrideController],
  providers: [MarketplaceOverrideService],
})
export class AdminMarketplaceOverrideModule {}
