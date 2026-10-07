import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWebsiteMargetPlaceTagDto {
  @ApiProperty({
    example: 'SEO',
    description: 'Unique website marketplace tag',
  })
  @IsString()
  @IsNotEmpty()
  tag!: string;
}
