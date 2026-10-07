import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CreditTaskController } from './credit-task.controller';
import { CreditTaskService } from './credit-task.service';

@Module({
  imports: [PrismaModule],
  controllers: [CreditTaskController],
  providers: [CreditTaskService],
  exports: [CreditTaskService],
})
export class CreditTaskModule {}
