import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum AdminDashboardPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class AdminDashboardQueryDto {
  @ApiPropertyOptional({
    enum: AdminDashboardPeriod,
    default: AdminDashboardPeriod.DAILY,
  })
  @IsOptional()
  @IsEnum(AdminDashboardPeriod)
  period: AdminDashboardPeriod = AdminDashboardPeriod.DAILY;
}
