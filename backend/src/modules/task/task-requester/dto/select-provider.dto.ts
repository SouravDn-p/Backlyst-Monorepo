import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SelectProviderDto {
  @ApiProperty({
    example: 'application-id',
    description: 'Placement application id to select for the task.',
  })
  @IsString()
  @IsNotEmpty()
  applicationId!: string;
}
