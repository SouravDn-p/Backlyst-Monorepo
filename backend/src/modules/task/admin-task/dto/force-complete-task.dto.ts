import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ForceCompleteTaskDto {
  @ApiProperty({
    example: 'Task completed manually after deadline and no provider response.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note!: string;
}
