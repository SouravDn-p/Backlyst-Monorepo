import { MessageRegistryStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMessageRegistryStatusDto {
  @ApiProperty({
    enum: MessageRegistryStatus,
  })
  @IsEnum(MessageRegistryStatus)
  registryStatus!: MessageRegistryStatus;

  @ApiPropertyOptional({
    example: 'Flagged due to suspicious proof exchange.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
