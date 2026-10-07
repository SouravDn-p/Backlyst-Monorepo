import { Module } from '@nestjs/common';
import { CreditCoreModule } from 'src/modules/credit/credit-core.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [PrismaModule, CreditCoreModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
