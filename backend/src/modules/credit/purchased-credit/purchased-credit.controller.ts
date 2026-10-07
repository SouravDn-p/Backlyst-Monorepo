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
import {
  AllocatePurchasedCreditsDto,
  BuyPurchasedCreditsDto,
} from '../dto/credit-wallet.dto';
import { PurchasedCreditService } from './purchased-credit.service';

@ApiTags('Purchased Credits')
@Controller('credits/purchased')
export class PurchasedCreditController {
  constructor(
    private readonly purchasedCreditService: PurchasedCreditService,
  ) {}

  @Post('allocate')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Allocate purchased credits from master wallet to website wallet',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchased credits moved from the user master wallet into one owned website wallet',
    schema: {
      example: {
        success: true,
        websiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
        allocatedAmount: 5,
        masterPurchasedTaskCredits: 7,
        websiteAllocatedPurchasedCredits: 10,
      },
    },
  })
  allocatePurchasedCredits(
    @CurrentUser('id') userId: string,
    @Body() body: AllocatePurchasedCreditsDto,
  ) {
    return this.purchasedCreditService.allocatePurchasedCredits(userId, body);
  }

  @Post('buy')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Create Stripe checkout session to buy purchased task credits',
  })
  @ApiResponse({
    status: 200,
    description: 'Stripe checkout session created for purchased task credits',
    schema: {
      example: {
        success: true,
        message: 'Purchased task credit checkout session created successfully.',
        data: {
          sessionId: 'cs_test_task_credit_001',
          url: 'https://checkout.stripe.com/c/pay/cs_test_task_credit_001',
          purchasedCredits: 7,
          pricing: {
            bundleCount: 1,
            singleCount: 2,
            totalAmountPence: 5997,
            totalAmount: '59.97',
            currency: 'GBP',
          },
        },
      },
    },
  })
  buyPurchasedCredits(
    @CurrentUser('id') userId: string,
    @Body() body: BuyPurchasedCreditsDto,
  ) {
    return this.purchasedCreditService.buyPurchasedCredits(userId, body);
  }

  @Get('checkout-success')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Confirm purchased task credit checkout after Stripe success',
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
      'Confirms Stripe payment and shows updated purchased credit balance',
    schema: {
      example: {
        success: true,
        message: 'Purchased credits applied successfully.',
        data: {
          sessionId: 'cs_test_task_credit_001',
          paymentStatus: 'paid',
          boughtAmount: 7,
          purchasedTaskCredits: 12,
        },
      },
    },
  })
  getPurchasedCreditsAfterCheckout(
    @CurrentUser('id') userId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    return this.purchasedCreditService.getPurchasedCreditsAfterCheckout(
      userId,
      sessionId,
    );
  }

  @ApiExcludeEndpoint()
  @Post('webhook')
  handlePurchasedCreditWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
    @Body() _body: unknown,
  ) {
    return this.purchasedCreditService.handlePurchasedCreditWebhook(
      req.rawBody,
      signature,
    );
  }
}
