import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { AllocateSubscriptionCreditsDto } from '../dto/credit-wallet.dto';
import { SubscriptionCreditService } from './subscription-credit.service';

@ApiTags('Subscription Credits')
@Controller('credits/subscription')
export class SubscriptionCreditController {
  constructor(
    private readonly subscriptionCreditService: SubscriptionCreditService,
  ) {}

  @Get()
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Get current user subscription task credits' })
  @ApiResponse({
    status: 200,
    description: 'Current active subscription task credit balance',
    schema: {
      example: {
        subscriptionTaskCredits: 8,
      },
    },
  })
  getSubscriptionCredits(@CurrentUser('id') userId: string) {
    return this.subscriptionCreditService.getSubscriptionCredits(userId);
  }

  @Post('allocate')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary:
      'Allocate subscription credits from master wallet to website wallet',
  })
  @ApiResponse({
    status: 200,
    description:
      'Subscription credits moved from the user master wallet into one owned website wallet',
    schema: {
      example: {
        success: true,
        websiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
        allocatedAmount: 3,
        masterSubscriptionTaskCredits: 5,
        websiteSubscriptionTaskCredits: 7,
      },
    },
  })
  allocateSubscriptionCredits(
    @CurrentUser('id') userId: string,
    @Body() body: AllocateSubscriptionCreditsDto,
  ) {
    return this.subscriptionCreditService.allocateSubscriptionCredits(
      userId,
      body,
    );
  }
}
