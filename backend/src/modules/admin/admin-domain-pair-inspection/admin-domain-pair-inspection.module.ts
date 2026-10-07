import { Module } from '@nestjs/common';
import { AdminDomainPairInspectionController } from './admin-domain-pair-inspection.controller';
import { AdminDomainPairInspectionService } from './admin-domain-pair-inspection.service';

@Module({
  controllers: [AdminDomainPairInspectionController],
  providers: [AdminDomainPairInspectionService],
})
export class AdminDomainPairInspectionModule {}
