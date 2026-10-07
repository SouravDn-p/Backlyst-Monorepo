import { Module } from '@nestjs/common';
import { AdminMarketplaceConfigController } from './admin-marketplace-config.controller';
import { AdminMarketplaceConfigService } from './admin-marketplace-config.service';
import { MarketplaceEngineModule } from 'src/modules/task/marketplace-engine/marketplace-engine.module';

@Module({
  imports: [MarketplaceEngineModule],
  controllers: [AdminMarketplaceConfigController],
  providers: [AdminMarketplaceConfigService],
})
export class AdminMarketplaceConfigModule {}
