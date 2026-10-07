import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RequesterDashboardController } from './requester-dashboard.controller';
import { RequesterDashboardService } from './requester-dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [RequesterDashboardController],
  providers: [RequesterDashboardService],
})
export class RequesterDashboardModule {}
