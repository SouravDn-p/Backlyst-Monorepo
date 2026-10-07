import { Module } from '@nestjs/common';
import { AdminMarketplaceModeController } from './admin-marketplace-mode.controller';
import { AdminMarketplaceModeService } from './admin-marketplace-mode.service';
import { MarketplaceEngineModule } from '../../task/marketplace-engine/marketplace-engine.module';

@Module({
  imports: [MarketplaceEngineModule],
  controllers: [AdminMarketplaceModeController],
  providers: [AdminMarketplaceModeService],
})
export class AdminMarketplaceModeModule {}
