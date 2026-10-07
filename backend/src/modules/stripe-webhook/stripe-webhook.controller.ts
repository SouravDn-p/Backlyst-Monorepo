import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @ApiExcludeEndpoint()
  @Post('webhook')
  handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
    @Body() _body: unknown,
  ) {
    return this.stripeWebhookService.handleWebhook(req.rawBody, signature);
  }
}
