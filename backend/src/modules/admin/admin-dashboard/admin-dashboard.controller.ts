import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import {
  AdminDashboardOverviewQueryDto,
  AdminDashboardOverviewResponseDto,
} from './dto/admin-dashboard-overview.dto';

@ApiTags('Admin Dashboard')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get admin dashboard overview cards' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['daily', 'weekly', 'monthly'],
    example: 'daily',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
    example: 'DAILY',
  })
  @ApiOkResponse({ type: AdminDashboardOverviewResponseDto })
  getOverview(@Query() query: AdminDashboardOverviewQueryDto) {
    return this.adminDashboardService.getOverview(query);
  }

  @Get('marketplace/health')
  @ApiOperation({ summary: 'Marketplace Engine Health Check' })
  @ApiOkResponse({ description: 'Returns a structured health check response' })
  getMarketplaceHealth() {
    return this.adminDashboardService.getMarketplaceHealth();
  }
}
