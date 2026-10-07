import { Module } from '@nestjs/common';
import { AdminWebsiteStatusController } from './admin-website-status.controller';
import { WebsiteStatusService } from './admin-website-status.service';
import { MarketplaceEngineModule } from 'src/modules/task/marketplace-engine/marketplace-engine.module';

@Module({
  // Spec §6: the admin recompute endpoint delegates to ScoringService
  // (recomputeQualityForWebsite), which is provided/exported by the marketplace
  // engine module.
  imports: [MarketplaceEngineModule],
  controllers: [AdminWebsiteStatusController],
  providers: [WebsiteStatusService],
  exports: [WebsiteStatusService],
})
export class AdminWebsiteStatusModule {}
