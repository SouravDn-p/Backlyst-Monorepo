import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength } from 'class-validator';

export enum AdminTaskStatusDtoEnum {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  WAITING_FOR_APPLICANTS = 'WAITING_FOR_APPLICANTS',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  APPROVED = 'APPROVED',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  FROZEN = 'FROZEN',
  DISPUTED = 'DISPUTED',
}

export class AdminUpdateTaskStatusDto {
  @ApiProperty({
    enum: AdminTaskStatusDtoEnum,
    enumName: 'AdminTaskStatus',
    example: AdminTaskStatusDtoEnum.REJECTED,
    description: 'Admin selected task lifecycle status.',
  })
  @IsEnum(AdminTaskStatusDtoEnum)
  status!: AdminTaskStatusDtoEnum;

  @ApiPropertyOptional({
    example: 'Rejected due to policy violation.',
    description: 'Required admin audit note for this status change.',
  })
  @IsString()
  @MaxLength(500)
  note!: string;
}
