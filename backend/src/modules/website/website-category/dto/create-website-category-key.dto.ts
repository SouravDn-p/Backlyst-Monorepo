import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWebsiteCategoryKeyDto {
  @ApiProperty({
    example: 'SAAS',
    description: 'Unique website category key',
  })
  @IsString()
  @IsNotEmpty()
  key!: string;
}