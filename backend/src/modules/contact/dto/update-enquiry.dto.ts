import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnquiryStatus } from '@prisma/client';

export class UpdateEnquiryDto {
  @ApiPropertyOptional({ example: true, description: 'Mark as read or unread' })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiPropertyOptional({ enum: EnquiryStatus, example: EnquiryStatus.RESOLVED })
  @IsEnum(EnquiryStatus)
  @IsOptional()
  status?: EnquiryStatus;

  @ApiPropertyOptional({ example: 'Your issue has been resolved. Please check your account.', description: 'Message to send to the user when updating status' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  replyMessage?: string;
}
