import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { CreditStatementQueryDto } from '../dto/credit-statement-query.dto';
import { WebsiteCreditService } from './website-credit.service';

@ApiTags('Website Credits')
@Controller('credits/websites')
export class WebsiteCreditController {
  constructor(private readonly websiteCreditService: WebsiteCreditService) {}

  @Get(':websiteId/summary')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Get credit activity summary for one owned website',
  })
  @ApiResponse({
    status: 200,
    description:
      'Current wallet balances and recent credit activity summary for one owned website',
    schema: {
      example: {
        website: {
          id: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
          name: 'Backlyst Demo Site',
          websiteUrl: 'https://demo.backlyst.com',
          verificationStatus: 'VERIFIED',
        },
        balances: {
          subscriptionTaskCredits: 4,
          earnedTaskCredits: 3,
          allocatedPurchasedCredits: 5,
          allocatedReferralCredits: 2,
          visibilityCredits: 1,
          visibilityActiveUntil: '2026-06-19T00:00:00.000Z',
          totalTaskCredits: 14,
        },
        meta: {
          totalTransactions: 9,
          latestActivityAt: '2026-06-12T11:20:00.000Z',
        },
      },
    },
  })
  getWebsiteCreditSummary(
    @CurrentUser('id') userId: string,
    @Param('websiteId') websiteId: string,
  ) {
    return this.websiteCreditService.getWebsiteCreditSummary(userId, websiteId);
  }

  @Get(':websiteId/wallet')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Get final website wallet balances' })
  @ApiResponse({
    status: 200,
    description: 'Current final wallet balances for one owned website',
    schema: {
      example: {
        website: {
          id: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
          name: 'Backlyst Demo Site',
          websiteUrl: 'https://demo.backlyst.com',
          verificationStatus: 'VERIFIED',
        },
        balances: {
          subscriptionTaskCredits: 4,
          earnedTaskCredits: 3,
          allocatedPurchasedCredits: 5,
          allocatedReferralCredits: 2,
          visibilityCredits: 1,
          visibilityActiveUntil: '2026-06-19T00:00:00.000Z',
          totalTaskCredits: 14,
        },
      },
    },
  })
  getWebsiteWallet(
    @CurrentUser('id') userId: string,
    @Param('websiteId') websiteId: string,
  ) {
    return this.websiteCreditService.getWebsiteWallet(userId, websiteId);
  }

  @Get(':websiteId/statement')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Get credit statement for one owned website' })
  @ApiResponse({
    status: 200,
    description: 'Paginated credit statement rows for one owned website',
    schema: {
      example: {
        items: [
          {
            id: 'clg_01jv0w1e2k7t7w6v7n8m9p0w',
            creditType: 'SUBSCRIPTION_TASK',
            logicalCreditBucket: 'SUBSCRIPTION_TASK',
            action: 'SPEND',
            reason: 'TASK_POST',
            amount: 2,
            balanceBefore: 6,
            balanceAfter: 4,
            websiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
            taskId: 'a16f47db-8ac8-4c9a-a58f-b2a01c0f2020',
            referralId: null,
            subscriptionId: 'sub_01jv0h2l4m5n6p7q8r9s',
            note: '2 task credits reserved for guest post task creation.',
            createdAt: '2026-06-12T10:10:00.000Z',
          },
          {
            id: 'clg_01jv0w2f3k7t7w6v7n8m9p0x',
            creditType: 'EARNED_TASK',
            logicalCreditBucket: 'PURCHASED_TASK',
            action: 'ADD',
            reason: 'MANUAL',
            amount: 5,
            balanceBefore: 0,
            balanceAfter: 5,
            websiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
            taskId: null,
            referralId: null,
            subscriptionId: null,
            note: '[WEBSITE_PURCHASED_IN] Received purchased credits from the master wallet.',
            createdAt: '2026-06-12T09:30:00.000Z',
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      },
    },
  })
  getWebsiteCreditStatement(
    @CurrentUser('id') userId: string,
    @Param('websiteId') websiteId: string,
    @Query() query: CreditStatementQueryDto,
  ) {
    return this.websiteCreditService.getWebsiteCreditStatement(
      userId,
      websiteId,
      query,
    );
  }
}
