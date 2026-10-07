import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AcceptDirectTaskRequestDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    description:
      'ID of the provider website selected to fulfill this direct task request.',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  providerWebsiteId!: string;
}
