import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { CreditStatementQueryDto } from '../dto/credit-statement-query.dto';
import {
  AllocateVisibilityCreditsDto,
  BuyVisibilityCreditsDto,
} from '../dto/credit-wallet.dto';
import { VisibilityCreditService } from './visibility-credit.service';

@ApiTags('Visibility Credits')
@Controller('credits/visibility')
export class VisibilityCreditController {
  constructor(
    private readonly visibilityCreditService: VisibilityCreditService,
  ) {}

  @Get('me')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Get visibility credit balances' })
  @ApiResponse({
    status: 200,
    description:
      'Aggregated visibility credit balances across the account and owned websites',
    schema: {
      example: {
        masterVisibilityCredits: 0,
        websiteVisibilityCredits: 3,
        totalVisibilityCredits: 3,
      },
    },
  })
  getVisibilityCredits(@CurrentUser('id') userId: string) {
    return this.visibilityCreditService.getVisibilityCredits(userId);
  }

  @Get('statement')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Get visibility credit statement' })
  @ApiResponse({
    status: 200,
    description: 'Paginated visibility credit statement rows',
    schema: {
      example: {
        items: [
          {
            id: 'clg_01visibility001',
            creditType: 'VISIBILITY',
            logicalCreditBucket: 'VISIBILITY',
            action: 'ADD',
            reason: 'MANUAL',
            amount: 2,
            balanceBefore: 1,
            balanceAfter: 3,
            websiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
            taskId: null,
            referralId: null,
            subscriptionId: null,
            note: '[WEBSITE_VISIBILITY_CHECKOUT][cs_test_vis_001] Stripe checkout visibility credits stacked onto website visibility period.',
            createdAt: '2026-06-12T12:20:00.000Z',
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
    },
  })
  getVisibilityStatement(
    @CurrentUser('id') userId: string,
    @Query() query: CreditStatementQueryDto,
  ) {
    return this.visibilityCreditService.getVisibilityStatement(userId, query);
  }

  @Post('buy')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Create Stripe checkout session to buy visibility credits',
  })
  @ApiResponse({
    status: 200,
    description:
      'Stripe checkout session created for master wallet visibility credits',
    schema: {
      example: {
        success: true,
        message: 'Visibility credit checkout session created successfully.',
        data: {
          sessionId: 'cs_test_vis_001',
          url: 'https://checkout.stripe.com/c/pay/cs_test_vis_001',
          visibilityCredits: 2,
          pricing: {
            totalAmountPence: 1998,
            totalAmount: '19.98',
            currency: 'GBP',
          },
        },
      },
    },
  })
  buyVisibilityCredits(
    @CurrentUser('id') userId: string,
    @Body() body: BuyVisibilityCreditsDto,
  ) {
    return this.visibilityCreditService.buyVisibilityCredits(userId, body);
  }

  @Post('allocate')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Allocate visibility credits from master wallet to website wallet',
  })
  @ApiResponse({
    status: 200,
    description:
      'Visibility credits moved from the user master wallet into one owned website wallet',
    schema: {
      example: {
        success: true,
        websiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
        allocatedAmount: 2,
        masterVisibilityCredits: 3,
        websiteVisibilityCredits: 2,
      },
    },
  })
  allocateVisibilityCredits(
    @CurrentUser('id') userId: string,
    @Body() body: AllocateVisibilityCreditsDto,
  ) {
    return this.visibilityCreditService.allocateVisibilityCredits(userId, body);
  }

  @Get('checkout-success')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Confirm visibility credit checkout after Stripe success',
  })
  @ApiQuery({
    name: 'sessionId',
    required: true,
    type: String,
    example: 'cs_test_123',
  })
  @ApiResponse({
    status: 200,
    description:
      'Confirms Stripe payment and shows updated master visibility balance',
    schema: {
      example: {
        success: true,
        message: 'Visibility credits added to master wallet successfully.',
        data: {
          sessionId: 'cs_test_vis_001',
          paymentStatus: 'paid',
          boughtAmount: 2,
          masterVisibilityCredits: 3,
        },
      },
    },
  })
  getVisibilityCreditsAfterCheckout(
    @CurrentUser('id') userId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    return this.visibilityCreditService.getVisibilityCreditsAfterCheckout(
      userId,
      sessionId,
    );
  }

  @ApiExcludeEndpoint()
  @Post('webhook')
  handleVisibilityCreditWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
    @Body() _body: unknown,
  ) {
    return this.visibilityCreditService.handleVisibilityCreditWebhook(
      req.rawBody,
      signature,
    );
  }
}
