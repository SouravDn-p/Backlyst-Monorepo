import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Stripe = require('stripe');
import { CreditService } from '../credit/credit.service';
import { UserSubscriptionService } from '../subscription/user-subscription/user-subscription.service';

@Injectable()
export class StripeWebhookService {
  private readonly stripe: InstanceType<typeof Stripe>;

  constructor(
    private readonly configService: ConfigService,
    private readonly creditService: CreditService,
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is missing');
    }

    this.stripe = new Stripe(stripeSecretKey);
  }

  async handleWebhook(rawBody: Buffer | undefined, signature: string) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!rawBody) {
      throw new BadRequestException(
        'Missing raw body for webhook verification',
      );
    }

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET is missing',
      );
    }

    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error: any) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${error.message}`,
      );
    }

    return this.dispatchEvent(event);
  }

  private async dispatchEvent(event: any) {
    const object: any = event.data?.object;
    const purchaseType = object?.metadata?.purchaseType;

    if (purchaseType === 'PURCHASED_TASK_CREDIT') {
      const result =
        await this.creditService.handlePurchasedCreditWebhookEvent(event);

      return { ...result, routedTo: 'purchased-credit' };
    }

    if (purchaseType === 'VISIBILITY_CREDIT') {
      const result =
        await this.creditService.handleVisibilityCreditWebhookEvent(event);

      return { ...result, routedTo: 'visibility-credit' };
    }

    if (this.isSubscriptionEvent(event)) {
      const result =
        await this.userSubscriptionService.handleStripeWebhookEvent(event);

      return { ...result, routedTo: 'subscription' };
    }

    return { received: true, routedTo: 'ignored' };
  }

  private isSubscriptionEvent(event: any) {
    const object: any = event.data?.object;

    return (
      object?.mode === 'subscription' ||
      Boolean(object?.metadata?.planId) ||
      event.type.startsWith('customer.subscription.') ||
      event.type.startsWith('invoice.')
    );
  }
}
