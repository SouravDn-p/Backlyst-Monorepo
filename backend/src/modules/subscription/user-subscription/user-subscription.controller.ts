import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { UserSubscriptionService } from './user-subscription.service';
import { CreateCheckoutDto } from './dto/create-user-subscription.dto';
import { SubscriptionStatus } from '@prisma/client';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';

@Controller('user-subscription')
@ApiTags('User Subscription')
export class UserSubscriptionController {
  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @Get('my-active-subscription')
  @ApiOperation({
    summary: 'Get my active subscription plan',
    description:
      'by imran: Use this after subscription is already saved in database. Returns the logged-in user active plan with plan details and credit summary.',
  })
  async myActiveSubscription(@Req() req: any) {
    return await this.userSubscriptionService.myActiveSubscription(req.user.id);
  }

  @UserGuard()
  @Get('checkout-success')
  @ApiOperation({
    summary: 'Get subscription after successful Stripe checkout',
    description:
      'by imran: Use this right after Stripe redirects to the frontend success page. Send the session_id from the success URL here, then this endpoint verifies the Stripe session and returns the logged-in user bought plan.',
  })
  @ApiQuery({
    name: 'sessionId',
    required: true,
    type: String,
    example: 'cs_test_123',
    description:
      'by imran: Pass the Stripe checkout session_id that comes from the frontend success URL, for example /subscription/success?session_id=...',
  })
  async getSubscriptionAfterCheckout(
    @Req() req: any,
    @Query('sessionId') sessionId?: string,
  ) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    return await this.userSubscriptionService.getSubscriptionAfterCheckout(
      req.user.id,
      sessionId,
    );
  }

  @UserGuard()
  @Get('my-subscription-history')
  @ApiOperation({
    summary: 'Get my subscription history',
    description:
      'Returns a paginated list of subscription history for the authenticated user. Supports optional filtering by subscription status.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SubscriptionStatus,
    description: 'Filter by subscription status',
  })
  async myselfSubscriptionHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: SubscriptionStatus,
  ) {
    return await this.userSubscriptionService.myselfSubscriptionHistory(
      req.user.id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      status,
    );
  }

  @ApiExcludeEndpoint()
  @Post('webhook')
  async handleStripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
    @Body() _body: unknown,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!req.rawBody) {
      throw new BadRequestException(
        'Missing raw body for webhook verification',
      );
    }

    return await this.userSubscriptionService.handleStripeWebhook(
      req.rawBody,
      signature,
    );
  }

  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @Post('checkout')
  @ApiOperation({
    summary: 'Create Stripe checkout session',
    description:
      'by imran: Call this first when user clicks buy subscription. Stripe will return a checkout URL. After payment success, frontend should call checkout-success endpoint with the returned session_id from success URL.',
  })
  @ApiBody({ type: CreateCheckoutDto })
  async createCheckoutSession(@Req() req: any, @Body() dto: CreateCheckoutDto) {
    return await this.userSubscriptionService.createCheckoutSession(
      req.user.id,
      dto,
    );
  }

  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @Patch('cancel')
  @ApiOperation({
    summary: 'Cancel subscription at the end of the billing period',
    description:
      'Disables Stripe auto-renewal. The subscription remains usable until the current paid billing period ends.',
  })
  async cencelSubscription(@Req() req: any) {
    // Stripe stops the next renewal; current paid access is not removed now.
    return await this.userSubscriptionService.cencelSubscription(req.user.id);
  }

  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @Patch('resume')
  @ApiOperation({
    summary: 'Resume subscription auto-renewal',
    description:
      'Re-enables Stripe auto-renewal when the current subscription was already scheduled for period-end cancellation.',
  })
  async resumeSubscription(@Req() req: any) {
    // User can reverse a scheduled cancellation before the paid period ends.
    return await this.userSubscriptionService.resumeSubscription(req.user.id);
  }
}
