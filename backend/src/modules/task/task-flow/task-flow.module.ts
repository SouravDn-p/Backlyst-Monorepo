import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TaskFlowService } from './task-flow.service';

@Module({
  imports: [PrismaModule],
  providers: [TaskFlowService],
  exports: [TaskFlowService],
})
export class TaskFlowModule {}
