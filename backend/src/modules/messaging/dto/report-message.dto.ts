import { MessageReportReason } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportMessageDto {
  @ApiProperty({
    enum: MessageReportReason,
  })
  @IsEnum(MessageReportReason)
  reason!: MessageReportReason;

  @ApiPropertyOptional({
    example: 'Suspicious off-platform payment request.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
