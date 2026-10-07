import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { AdminDashboardPeriod } from './admin-dashboard-query.dto';

export type AdminDashboardRange = 'daily' | 'weekly' | 'monthly';

export class AdminDashboardOverviewQueryDto {
  @ApiProperty({
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily',
    required: false,
  })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  range?: AdminDashboardRange;

  @ApiProperty({
    enum: AdminDashboardPeriod,
    default: AdminDashboardPeriod.DAILY,
    required: false,
  })
  @IsOptional()
  @IsEnum(AdminDashboardPeriod)
  period?: AdminDashboardPeriod;
}

export class ActiveUsersOverviewDto {
  @ApiProperty({ example: 14208 })
  count!: number;

  @ApiProperty({ example: 15120 })
  totalUsers!: number;

  @ApiProperty({ example: 86 })
  newUsersInRange!: number;

  @ApiProperty({ example: 'Verified Marketing Participants' })
  description!: string;
}

export class ActiveWebsitesOverviewDto {
  @ApiProperty({ example: 2452 })
  verified!: number;

  @ApiProperty({ example: 156 })
  pending!: number;

  @ApiProperty({ example: 32 })
  flagged!: number;

  @ApiProperty({ example: 12 })
  failed!: number;

  @ApiProperty({ example: 8 })
  rejected!: number;

  @ApiProperty({ example: 24 })
  newWebsitesInRange!: number;
}

export class TaskOversightDto {
  @ApiProperty({ example: 4312 })
  totalTasks!: number;

  @ApiProperty({ example: 4824 })
  totalUsers!: number;

  @ApiProperty({ example: 34 })
  disputedTasks!: number;

  @ApiProperty({ example: 91 })
  tasksInRange!: number;
}

export class CreditSimulationValueDto {
  @ApiProperty({ example: 14200 })
  value!: number;

  @ApiProperty({ example: '14.2k' })
  displayValue!: string;
}

export class CreditSimulationDto {
  @ApiProperty({ type: CreditSimulationValueDto })
  subscriptionCredits!: CreditSimulationValueDto;

  @ApiProperty({ type: CreditSimulationValueDto })
  referralEarnedCredits!: CreditSimulationValueDto;

  @ApiProperty({ type: CreditSimulationValueDto })
  visibilityCredits!: CreditSimulationValueDto;
}

export class AdminDashboardOverviewDataDto {
  @ApiProperty({ type: ActiveUsersOverviewDto })
  activeUsers!: ActiveUsersOverviewDto;

  @ApiProperty({ type: ActiveWebsitesOverviewDto })
  activeWebsites!: ActiveWebsitesOverviewDto;

  @ApiProperty({ type: TaskOversightDto })
  taskOversight!: TaskOversightDto;

  @ApiProperty({ type: CreditSimulationDto })
  creditSimulation!: CreditSimulationDto;

  @ApiProperty({ type: Object })
  taskLifecycle!: Record<string, unknown>;

  @ApiProperty({ type: Object })
  securityAudit!: Record<string, unknown>;

  @ApiProperty({ type: Object })
  governanceFeed!: Record<string, unknown>;

  @ApiProperty({ type: Object })
  accessAuditLogs!: Record<string, unknown>;

  @ApiProperty({ type: Object })
  meta!: Record<string, unknown>;
}

export class AdminDashboardOverviewResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Admin dashboard overview fetched successfully' })
  message!: string;

  @ApiProperty({ type: AdminDashboardOverviewDataDto })
  data!: AdminDashboardOverviewDataDto;
}
