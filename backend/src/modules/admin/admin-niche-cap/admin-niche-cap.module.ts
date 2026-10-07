import { Module } from '@nestjs/common';
import { AdminNicheCapController } from './admin-niche-cap.controller';
import { AdminNicheCapService } from './admin-niche-cap.service';

@Module({
  controllers: [AdminNicheCapController],
  providers: [AdminNicheCapService],
  exports: [AdminNicheCapService],
})
export class AdminNicheCapModule {}
