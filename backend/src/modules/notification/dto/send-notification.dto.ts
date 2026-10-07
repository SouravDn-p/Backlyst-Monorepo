import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationCategory,
  NotificationEntityType,
  NotificationPriority,
  NotificationType,
} from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ enum: NotificationCategory })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ example: 'Task approved' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Your task has been approved.' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'actor-user-id' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ enum: NotificationEntityType })
  @IsOptional()
  @IsEnum(NotificationEntityType)
  entityType?: NotificationEntityType;

  @ApiPropertyOptional({ example: 'entity-id' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ example: 'task:123:approved' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class SendUserNotificationDto extends SendNotificationDto {
  @ApiProperty({ example: 'recipient-user-id' })
  @IsString()
  @IsNotEmpty()
  recipientId: string;
}
