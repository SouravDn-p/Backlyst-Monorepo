import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminComplianceController } from './admin-compliance.controller';
import { AdminComplianceService } from './admin-compliance.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminComplianceController],
  providers: [AdminComplianceService],
})
export class AdminComplianceModule {}
