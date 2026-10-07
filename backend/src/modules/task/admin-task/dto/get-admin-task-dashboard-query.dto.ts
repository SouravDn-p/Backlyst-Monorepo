import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum AdminTaskDashboardRangeDtoEnum {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class GetAdminTaskDashboardQueryDto {
  @ApiPropertyOptional({
    enum: AdminTaskDashboardRangeDtoEnum,
    enumName: 'AdminTaskDashboardRange',
    example: AdminTaskDashboardRangeDtoEnum.DAILY,
    description:
      'Preset time range for dashboard metrics. Ignored when from/to are provided.',
  })
  @IsOptional()
  @IsEnum(AdminTaskDashboardRangeDtoEnum)
  range?: AdminTaskDashboardRangeDtoEnum;

  @ApiPropertyOptional({
    example: '2026-06-01T00:00:00.000Z',
    description:
      'Optional custom period start in ISO format. Overrides range when provided.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-06-30T23:59:59.999Z',
    description:
      'Optional custom period end in ISO format. Overrides range when provided.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
