import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminReferralController } from './admin-referral.controller';
import { AdminReferralService } from './admin-referral.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminReferralController],
  providers: [AdminReferralService],
})
export class AdminReferralModule {}
