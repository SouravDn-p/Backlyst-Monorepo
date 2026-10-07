import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProviderDashboardController } from './provider-dashboard.controller';
import { ProviderDashboardService } from './provider-dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProviderDashboardController],
  providers: [ProviderDashboardService],
})
export class ProviderDashboardModule {}
