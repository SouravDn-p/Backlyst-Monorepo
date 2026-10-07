import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true'
    ? true
    : value === false || value === 'false'
      ? false
      : value;

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  taskStatusUpdates?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  creditBalanceAlerts?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  disputeReviewNotifications?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  systemAnnouncements?: boolean;

  @ApiPropertyOptional({
    example: ['Notification', 'Payments', 'Security'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactPreferenceTags?: string[];
}
