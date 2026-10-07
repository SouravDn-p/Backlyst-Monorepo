import { Controller, Get } from '@nestjs/common';
import { UserSubscriptionPlanService } from './user-subscription-plan.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('user-subscription-plan')
export class UserSubscriptionPlanController {
  constructor(
    private readonly userSubscriptionPlanService: UserSubscriptionPlanService,
  ) {}

  @ApiTags('User Subscription Plan')
  @Get('all')
  @ApiOperation({
    summary: 'Get all plans',
    description: 'Allows user to get all plans.',
  })
  findAllPlan() {
    return this.userSubscriptionPlanService.findAllPlan();
  }
}
