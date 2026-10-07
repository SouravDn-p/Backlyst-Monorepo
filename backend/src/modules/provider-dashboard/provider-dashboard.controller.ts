import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GetProviderDashboardActivityQueryDto } from './dto/get-provider-dashboard-activity-query.dto';
import { GetProviderDashboardSummaryQueryDto } from './dto/get-provider-dashboard-summary-query.dto';
import { ProviderDashboardService } from './provider-dashboard.service';

@Controller('provider/dashboard')
@ApiTags('Provider Dashboard')
@ApiBearerAuth(ACCESS_TOKEN)
@UseGuards(JwtAuthGuard)
export class ProviderDashboardController {
  constructor(
    private readonly providerDashboardService: ProviderDashboardService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get provider dashboard summary',
    description:
      'Returns provider application metrics, workload metrics, performance rates, and contribution summary.',
  })
  @ApiQuery({ name: 'websiteId', required: false, type: String })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', 'all'],
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  getSummary(
    @CurrentUser('id') providerId: string,
    @Query() query: GetProviderDashboardSummaryQueryDto,
  ) {
    return this.providerDashboardService.getSummary(providerId, query);
  }

  @Get('task-control')
  @ApiOperation({
    summary: 'Get provider task control summary',
    description:
      'Returns compact provider task counters for the task control widget, including all, active, submitted, and review buckets.',
  })
  @ApiQuery({ name: 'websiteId', required: false, type: String })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', 'all'],
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  getTaskControl(
    @CurrentUser('id') providerId: string,
    @Query() query: GetProviderDashboardSummaryQueryDto,
  ) {
    return this.providerDashboardService.getTaskControl(providerId, query);
  }

  @Get('activity')
  @ApiOperation({
    summary: 'Get provider dashboard activity feed',
    description:
      'Returns paginated provider activity from TaskFlow with optional website, event type, and date filters.',
  })
  @ApiQuery({ name: 'websiteId', required: false, type: String })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  getActivity(
    @CurrentUser('id') providerId: string,
    @Query() query: GetProviderDashboardActivityQueryDto,
  ) {
    return this.providerDashboardService.getActivity(providerId, query);
  }
}
