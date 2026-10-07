import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ManualMatchQueue status values (mirror the Prisma `ManualMatchQueue.status`
 * string column per spec §18 / §21).
 * - PENDING   : queued for admin review, not yet actioned.
 * - APPLIED    : admin injected the match and it was applied downstream.
 * - RESOLVED   : reviewed and resolved (no further action required).
 * - CANCELLED  : dismissed by an admin.
 */
export enum ManualMatchQueueStatusDtoEnum {
  PENDING = 'PENDING',
  APPLIED = 'APPLIED',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export const MANUAL_MATCH_QUEUE_STATUS_VALUES: ManualMatchQueueStatusDtoEnum[] =
  Object.values(ManualMatchQueueStatusDtoEnum);

/**
 * Body for POST /admin/manual-match-queue.
 * Admin injects a candidate match for a requester task / provider website pair
 * that the matching engine could not surface under LOW_POOL.
 */
export class EnqueueManualMatchDto {
  @ApiProperty({
    example: 'clxk1task0001',
    description: 'Open/relevant PlacementTask id to inject a match for.',
  })
  @IsString()
  taskId!: string;

  @ApiProperty({
    example: 'clxk1prov0001',
    description: 'Provider website id proposed for the manual match.',
  })
  @IsString()
  providerWebsiteId!: string;

  @ApiProperty({
    example: 'clxk1req0001',
    description: 'Requester website id associated with the task.',
  })
  @IsString()
  requesterWebsiteId!: string;

  @ApiPropertyOptional({
    example: 'Starved segment — manually paired by ops.',
    description: 'Optional admin note describing why the match was queued.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * Body for POST /admin/manual-match-queue/:id/resolve.
 */
export class ResolveManualMatchDto {
  @ApiProperty({
    enum: ManualMatchQueueStatusDtoEnum,
    example: ManualMatchQueueStatusDtoEnum.APPLIED,
    description:
      'Final decision. APPLIED marks the match as actioned downstream; RESOLVED closes it as reviewed; CANCELLED dismisses it. Terminal statuses (APPLIED/RESOLVED/CANCELLED) reject already-terminal rows.',
  })
  @IsEnum(ManualMatchQueueStatusDtoEnum)
  decision!: ManualMatchQueueStatusDtoEnum;

  @ApiPropertyOptional({
    example: 'Pairing approved and applied to the task.',
    description: 'Optional resolution note appended to the queue row.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * Query params for GET /admin/manual-match-queue.
 */
export class ListManualMatchQueueDto {
  @ApiPropertyOptional({
    enum: ManualMatchQueueStatusDtoEnum,
    description: 'Filter by queue status.',
  })
  @IsOptional()
  @IsEnum(ManualMatchQueueStatusDtoEnum)
  status?: ManualMatchQueueStatusDtoEnum;

  @ApiPropertyOptional({
    example: 'clxk1task0001',
    description: 'Filter by task id.',
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({
    example: 1,
    description: '1-based page number.',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Page size (max 100).',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;
}
