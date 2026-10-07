import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { REQUESTED_DEADLINE_DAYS_ENUM } from './create-task.dto';

export class UpdateDeadlineDto {
  @ApiProperty({ enum: REQUESTED_DEADLINE_DAYS_ENUM, example: 14 })
  @IsIn(REQUESTED_DEADLINE_DAYS_ENUM)
  requestedDeadlineDays!: number;
}
