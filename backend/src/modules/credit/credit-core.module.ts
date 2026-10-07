import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CreditService } from './credit.service';

@Module({
  imports: [PrismaModule],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditCoreModule {}
