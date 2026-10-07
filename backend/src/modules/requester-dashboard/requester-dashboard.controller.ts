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
import { GetRequesterDashboardSummaryQueryDto } from './dto/get-requester-dashboard-summary-query.dto';
import { RequesterDashboardService } from './requester-dashboard.service';

@Controller('requester/dashboard')
@ApiTags('Requester Dashboard')
@ApiBearerAuth(ACCESS_TOKEN)
@UseGuards(JwtAuthGuard)
export class RequesterDashboardController {
  constructor(
    private readonly requesterDashboardService: RequesterDashboardService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get requester dashboard summary',
    description:
      'Returns requester task counts, task credit spend, and basic requester performance rates.',
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
    @CurrentUser('id') requesterId: string,
    @Query() query: GetRequesterDashboardSummaryQueryDto,
  ) {
    return this.requesterDashboardService.getSummary(requesterId, query);
  }
}
