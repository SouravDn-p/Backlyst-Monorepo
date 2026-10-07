import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminForensicAuditController } from './admin-forensic-audit.controller';
import { AdminForensicAuditService } from './admin-forensic-audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminForensicAuditController],
  providers: [AdminForensicAuditService],
  exports: [AdminForensicAuditService],
})
export class AdminForensicAuditModule {}
