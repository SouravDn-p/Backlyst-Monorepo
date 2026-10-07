import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({
    example: 'cmabc123xyz',
    description: 'Subscription plan id',
  })
  @IsString()
  @IsNotEmpty()
  planId: string;
}
