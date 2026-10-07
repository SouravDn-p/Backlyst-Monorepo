import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({
    example: 'Violation of community guidelines',
    description: 'Reason for suspending the user',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    example: 7,
    description: 'Duration of suspension in days',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  durationInDays: number;
}
