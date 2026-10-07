import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class FreezeTaskDto {
  @ApiProperty({
    example: 'Fraud checks pending for this task.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note!: string;
}
