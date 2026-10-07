import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminCreditController } from './admin-credit.controller';
import { AdminCreditService } from './admin-credit.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminCreditController],
  providers: [AdminCreditService],
})
export class AdminCreditModule {}
