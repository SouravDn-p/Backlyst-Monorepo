import { Module } from '@nestjs/common';
import { PlatformFeatureToggleController } from './platform-feature-toggle.controller';
import { PlatformFeatureToggleService } from './platform-feature-toggle.service';

@Module({
  controllers: [PlatformFeatureToggleController],
  providers: [PlatformFeatureToggleService],
  exports: [PlatformFeatureToggleService],
})
export class PlatformFeatureToggleModule {}
