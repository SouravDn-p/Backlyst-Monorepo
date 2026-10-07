import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetMozStatsDto {
  @ApiProperty({
    example: '10minuteschool.com',
    description: 'Domain name or URL to fetch MOZ statistics',
  })
  @IsString()
  @IsNotEmpty()
  domain: string;
}
