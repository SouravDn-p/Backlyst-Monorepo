import { MessageReportStatus } from '@prisma/client';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewMessageReportDto {
  @ApiProperty({
    enum: [
      MessageReportStatus.REVIEWED,
      MessageReportStatus.DISMISSED,
      MessageReportStatus.ACTION_TAKEN,
    ],
  })
  @IsEnum(MessageReportStatus)
  status!: MessageReportStatus;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
