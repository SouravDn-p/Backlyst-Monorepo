import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AdminSubscriptionService } from './admin-subscription.service';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';

@Controller('admin-subscription')
@ApiTags('Admin Subscription')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
export class AdminSubscriptionController {
  constructor(
    private readonly adminSubscriptionService: AdminSubscriptionService,
  ) {}
  @Get('all')
  @ApiOperation({
    summary: 'Get all subscriptions',
    description:
      'Returns a paginated list of all subscriptions with analytics.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  async findAllSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.adminSubscriptionService.findAllSubscriptions(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }
}
