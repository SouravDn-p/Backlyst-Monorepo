import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { CreditTaskService } from './credit-task.service';
import {
  DeductTaskCreditDto,
  RefundTaskCreditDto,
  RewardProviderCreditDto,
} from './dto/task-credit.dto';

@ApiTags('Task Credits')
@Controller('credits/tasks')
export class CreditTaskController {
  constructor(private readonly creditTaskService: CreditTaskService) {}

  @Post('deduct')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Deduct or reserve requester website task credits',
  })
  @ApiResponse({
    status: 200,
    description:
      'Deducts task credits from the requester website wallet for task reservation',
    schema: {
      example: {
        success: true,
        source: 'PURCHASED',
        deducted: 2,
        requesterWebsiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
      },
    },
  })
  deductTaskCredit(
    @CurrentUser('id') actorUserId: string,
    @Body() body: DeductTaskCreditDto,
  ) {
    return this.creditTaskService.deductTaskCredit(actorUserId, body);
  }

  @Post('refund')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Refund reserved credits back to the requester website wallet',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns reserved task credits back into the original requester website wallet bucket',
    schema: {
      example: {
        success: true,
        refundedTo: 'PURCHASED',
        amount: 2,
        requesterWebsiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
      },
    },
  })
  refundTaskCredit(
    @CurrentUser('id') actorUserId: string,
    @Body() body: RefundTaskCreditDto,
  ) {
    return this.creditTaskService.refundTaskCredit(actorUserId, body);
  }

  @Post('reward-provider')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Add earned credits to the provider website after task completion',
  })
  @ApiResponse({
    status: 200,
    description:
      'Rewards earned task credits into the selected provider website wallet after completion',
    schema: {
      example: {
        id: 'cw_provider_wallet_001',
        websiteId: '8aa4d111-b6f9-4af5-9bda-6af09c22f555',
        subscriptionTaskCredits: 0,
        earnedTaskCredits: 6,
        allocatedPurchasedCredits: 0,
        allocatedReferralCredits: 0,
      },
    },
  })
  rewardProviderCredit(
    @CurrentUser('id') actorUserId: string,
    @Body() body: RewardProviderCreditDto,
  ) {
    return this.creditTaskService.rewardProviderCredit(actorUserId, body);
  }
}
