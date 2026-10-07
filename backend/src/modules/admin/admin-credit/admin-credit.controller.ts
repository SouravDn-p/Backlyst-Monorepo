import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AdminCreditService } from './admin-credit.service';
import {
  AddAdminCreditDto,
  RemoveAdminCreditDto,
  UpdateWebsiteWalletLockDto,
} from './dto/admin-credit.dto';
import { AdminWebsiteDetailsQueryDto } from './dto/admin-website-details-query.dto';

@ApiTags('Admin Credits')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/credits')
export class AdminCreditController {
  constructor(private readonly adminCreditService: AdminCreditService) {}

  @Post('websites/:websiteId/task-credits')
  @ApiOperation({ summary: 'Admin add task credits directly to a website' })
  @ApiParam({ name: 'websiteId', type: String })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        success: true,
        message: 'Task credits added successfully',
        data: {
          websiteId: 'website-id',
          amount: 5,
          balanceBefore: 3,
          balanceAfter: 8,
          alreadyProcessed: false,
        },
      },
    },
  })
  addTaskCredits(
    @Param('websiteId') websiteId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: AddAdminCreditDto,
  ) {
    return this.adminCreditService.addTaskCredits(adminId, websiteId, body);
  }

  @Post('websites/:websiteId/visibility-credits')
  @ApiOperation({
    summary: 'Admin add visibility credits directly to a website',
  })
  @ApiParam({ name: 'websiteId', type: String })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        success: true,
        message: 'Visibility credits added successfully',
        data: {
          websiteId: 'website-id',
          amount: 2,
          balanceBefore: 1,
          balanceAfter: 3,
          visibilityDays: 14,
          visibilityActiveUntil: '2026-07-04T00:00:00.000Z',
          alreadyProcessed: false,
        },
      },
    },
  })
  addVisibilityCredits(
    @Param('websiteId') websiteId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: AddAdminCreditDto,
  ) {
    return this.adminCreditService.addVisibilityCredits(
      adminId,
      websiteId,
      body,
    );
  }

  @Get('governance-summary')
  @ApiOperation({
    summary: 'Get platform-wide credit governance summary',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: 'Credit governance summary fetched successfully',
        data: {
          subscriptionPoolCredits: {
            value: 1240000,
            displayValue: '1.24M',
          },
          referralCredits: {
            value: 452000,
            displayValue: '452K',
          },
          visibilityPoolCredits: {
            value: 18500,
            displayValue: '18.5K',
          },
          earnedCredits: {
            value: 45000,
            displayValue: '45K',
          },
          creditUsage: {
            used: {
              value: 1580,
              displayValue: '1.58K CR',
            },
            available: {
              value: 2290,
              displayValue: '2.29K CR',
            },
          },
        },
      },
    },
  })
  getGovernanceSummary() {
    return this.adminCreditService.getGovernanceSummary();
  }

  @Post('websites/:websiteId/task-credits/remove')
  @ApiOperation({ summary: 'Admin remove task credits from a website' })
  removeTaskCredits(
    @Param('websiteId') websiteId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: RemoveAdminCreditDto,
  ) {
    return this.adminCreditService.removeTaskCredits(adminId, websiteId, body);
  }

  @Patch('websites/:websiteId/wallet-lock')
  @ApiOperation({ summary: 'Admin lock or unlock a website wallet' })
  updateWalletLock(
    @Param('websiteId') websiteId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: UpdateWebsiteWalletLockDto,
  ) {
    return this.adminCreditService.updateWalletLock(adminId, websiteId, body);
  }

  @Get('websites/:websiteId/details')
  @ApiOperation({
    summary: 'Get complete credit and subscription details for one website',
  })
  @ApiParam({
    name: 'websiteId',
    type: String,
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: 'Website details fetched successfully',
        data: {
          website: {
            id: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
            name: 'Backlyst Demo Site',
            url: 'https://demo.backlyst.com',
            verificationStatus: 'VERIFIED',
          },
          wallet: {
            subscriptionCredits: 4,
            earnedCredits: 3,
            purchasedCredits: 5,
            referralCredits: 2,
            visibilityCredits: 1,
            visibilityActiveUntil: '2026-07-01T00:00:00.000Z',
            creditOnHold: 2,
            status: 'ACTIVE',
          },
          subscription: {
            id: 'sub_01jv0h2l4m5n6p7q8r9s',
            tier: 'GOLD',
            name: 'Gold',
            cost: 49.99,
            billingInterval: 'MONTHLY',
            status: 'ACTIVE',
            startDate: '2026-06-01T00:00:00.000Z',
            endDate: '2026-07-01T00:00:00.000Z',
            autoRenew: true,
          },
          transactions: [
            {
              id: 'clg_01jv0w1e2k7t7w6v7n8m9p0w',
              creditType: 'SUBSCRIPTION_TASK',
              action: 'SPEND',
              reason: 'TASK_POST',
              amount: 2,
              balanceBefore: 6,
              balanceAfter: 4,
              taskId: 'task_01jv0w1e2k7t7w6v7n8m9p0w',
              referralId: null,
              subscriptionId: 'sub_01jv0h2l4m5n6p7q8r9s',
              note: '2 task credits reserved for task creation.',
              createdAt: '2026-06-12T10:10:00.000Z',
              signedAmount: -2,
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      },
    },
  })
  getWebsiteDetails(
    @Param('websiteId') websiteId: string,
    @Query() query: AdminWebsiteDetailsQueryDto,
  ) {
    return this.adminCreditService.getWebsiteDetails(websiteId, query);
  }
}
