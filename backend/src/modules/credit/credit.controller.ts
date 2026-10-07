import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { CreditService } from './credit.service';
import { CreditStatementQueryDto } from './dto/credit-statement-query.dto';

@ApiTags('Credits')
@Controller('credits')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  // Admin-only dashboard summary route for the credit simulation card.
  @Get('admin/dashboard')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Get admin dashboard credit panel data',
    description:
      'Admin note: returns only the three Credit Simulation card values: subscriptions, referral/earned, and visibility. This endpoint intentionally excludes all other dashboard widgets.',
  })
  @ApiResponse({
    status: 200,
    description: 'Three values for the admin dashboard Credit Simulation card',
    schema: {
      example: {
        subscriptions: {
          value: 14200,
          displayValue: '14.2k',
        },
        referralEarned: {
          value: 18000,
          displayValue: '18k',
        },
        visibility: {
          value: 4500,
          displayValue: '4.5k',
        },
      },
    },
  })
  getAdminCreditDashboard() {
    return this.creditService.getAdminCreditDashboard();
  }

  // Main user credit overview that combines master wallet and owned website totals.
  @Get('me')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Get combined credit overview for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Combined master-level and website-level credit overview',
    schema: {
      example: {
        masterSubscriptionTaskCredits: 0,
        websiteSubscriptionTaskCredits: 0,
        subscriptionCredits: 0,
        earnedTaskCredits: 0,
        purchasedTaskCredits: 0,
        referralTaskCredits: 0,
        visibilityCredits: 0,
        totalTaskCredits: 0,
        lifetimeTotalCreditEarned: 0,
        thisMonthTotalCredits: 0,
        completedTaskTotalCredits: 0,
      },
    },
  })
  getMyCredits(@CurrentUser('id') userId: string) {
    return this.creditService.getMyCredits(userId);
  }

  // Lightweight dashboard card response for the logged-in user's UI.
  @Get('dashboard/summary')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Get credit summary cards for the current user dashboard',
    description:
      'Returns the four credit summary card values for the logged-in user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit summary values for the authenticated user dashboard',
    schema: {
      example: {
        availableCredits: 12,
        availableVisibilityCredits: 4,
        usedThisMonth: 3,
        maximumCapacity: 50,
        activeSubscription: {
          id: 'sub_01jv0h2l4m5n6p7q8r9s',
          planId: 'plan_01jv0h2l4m5n6p7q8r9t',
          planName: 'Growth',
          status: 'ACTIVE',
        },
      },
    },
  })
  getMyDashboardCreditSummary(@CurrentUser('id') userId: string) {
    return this.creditService.getMyDashboardCreditSummary(userId);
  }

  // Master wallet routes show only account-level balances before website allocation.
  @Get('master')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Get master credit wallet summary' })
  @ApiResponse({
    status: 200,
    description: 'Current balances stored in the user master wallet',
    schema: {
      example: {
        subscriptionTaskCredits: 5,
        purchasedTaskCredits: 6,
        referralTaskCredits: 3,
        visibilityCredits: 1,
        totalMasterTaskCredits: 14,
      },
    },
  })
  getMasterCredits(@CurrentUser('id') userId: string) {
    return this.creditService.getMasterCredits(userId);
  }

  // Master wallet statement excludes website-level earned/spend activity.
  @Get('master/statement')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Get master credit wallet statement' })
  @ApiResponse({
    status: 200,
    description:
      'Paginated statement rows related only to master wallet movements',
    schema: {
      example: {
        items: [
          {
            id: 'clg_01jv0haaa2k7t7w6v7n8m9p0a',
            creditType: 'EARNED_TASK',
            logicalCreditBucket: 'PURCHASED_TASK',
            action: 'ADD',
            reason: 'MANUAL',
            amount: 10,
            balanceBefore: 0,
            balanceAfter: 10,
            websiteId: null,
            taskId: null,
            referralId: null,
            subscriptionId: null,
            note: '[MASTER_PURCHASED] Manual purchased credit top-up.',
            createdAt: '2026-06-12T09:30:00.000Z',
          },
          {
            id: 'clg_01jv0hbbb3k7t7w6v7n8m9p0b',
            creditType: 'EARNED_TASK',
            logicalCreditBucket: 'REFERRAL_TASK',
            action: 'SPEND',
            reason: 'MANUAL',
            amount: 2,
            balanceBefore: 5,
            balanceAfter: 3,
            websiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
            taskId: null,
            referralId: null,
            subscriptionId: null,
            note: '[MASTER_REFERRAL] Allocated referral credits from master wallet to website wallet.',
            createdAt: '2026-06-12T10:00:00.000Z',
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
  getMasterCreditStatement(
    @CurrentUser('id') userId: string,
    @Query() query: CreditStatementQueryDto,
  ) {
    return this.creditService.getMasterCreditStatement(userId, query);
  }

  // Full statement can include both master-level and website-linked credit movements.
  @Get('statement')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Get current user credit statement' })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number for paginated credit statements',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'Number of statement rows per page',
  })
  @ApiQuery({
    name: 'creditType',
    required: false,
    enum: ['SUBSCRIPTION_TASK', 'EARNED_TASK', 'VISIBILITY'],
    example: 'EARNED_TASK',
    description: 'Filter by credit bucket type',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: ['ADD', 'SPEND', 'EXPIRE', 'REFUND', 'REWARD'],
    example: 'SPEND',
    description: 'Filter by credit action',
  })
  @ApiQuery({
    name: 'reason',
    required: false,
    enum: [
      'SUBSCRIPTION_PURCHASE',
      'TASK_COMPLETION',
      'TASK_POST',
      'REFERRAL_WEBSITE_VERIFIED',
      'REFERRAL_FIRST_BACKLINK',
      'REFERRAL_PAID_SUBSCRIPTION',
      'MANUAL',
    ],
    example: 'TASK_POST',
    description: 'Filter by business reason for the credit movement',
  })
  @ApiQuery({
    name: 'websiteId',
    required: false,
    example: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
    description: 'Filter by related website id',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    example: '2026-05-01T00:00:00.000Z',
    description: 'Start date filter in ISO format',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    example: '2026-05-31T23:59:59.999Z',
    description: 'End date filter in ISO format',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated credit statement list',
    schema: {
      example: {
        items: [
          {
            id: 'clg_01jv0hg9e2k7t7w6v7n8m9p0q',
            creditType: 'SUBSCRIPTION_TASK',
            logicalCreditBucket: 'SUBSCRIPTION_TASK',
            action: 'SPEND',
            reason: 'TASK_POST',
            amount: 1,
            balanceBefore: 10,
            balanceAfter: 9,
            websiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
            taskId: 'a16f47db-8ac8-4c9a-a58f-b2a01c0f2020',
            referralId: null,
            subscriptionId: 'sub_01jv0h2l4m5n6p7q8r9s',
            note: '1 task credit spent for posting a task',
            createdAt: '2026-05-16T09:30:00.000Z',
          },
          {
            id: 'clg_01jv0hh2n3m4k5j6h7g8f9d0s',
            creditType: 'EARNED_TASK',
            logicalCreditBucket: 'EARNED_TASK',
            action: 'REWARD',
            reason: 'TASK_COMPLETION',
            amount: 2,
            balanceBefore: 3,
            balanceAfter: 5,
            websiteId: null,
            taskId: 'a16f47db-8ac8-4c9a-a58f-b2a01c0f2020',
            referralId: null,
            subscriptionId: null,
            note: 'Provider earned task credits after task completion',
            createdAt: '2026-05-15T13:12:00.000Z',
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
  getCreditStatement(
    @CurrentUser('id') userId: string,
    @Query() query: CreditStatementQueryDto,
  ) {
    return this.creditService.getCreditStatement(userId, query);
  }

  // Earned credits here are an aggregated overview, not a single website wallet balance.
  @Get('earned')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Get aggregated earned task credit overview across owned websites',
  })
  @ApiResponse({
    status: 200,
    description:
      'Combined earned task credit overview for the authenticated user. Use website wallet endpoints for website-specific spendable earned balance.',
    schema: {
      example: {
        aggregatedEarnedTaskCredits: 12,
        note: 'Combined overview across owned websites; use website wallet for spendable earned balance.',
      },
    },
  })
  getEarnedCredits(@CurrentUser('id') userId: string) {
    return this.creditService.getEarnedCredits(userId);
  }
}
