import { Controller } from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';

@Controller('subscription-plan')
export class SubscriptionPlanController {
  constructor(
    private readonly subscriptionPlanService: SubscriptionPlanService,
  ) {}
}
