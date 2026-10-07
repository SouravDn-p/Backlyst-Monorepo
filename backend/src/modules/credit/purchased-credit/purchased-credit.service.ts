import { Injectable } from '@nestjs/common';
import { CreditService } from '../credit.service';
import {
  AllocatePurchasedCreditsDto,
  BuyPurchasedCreditsDto,
} from '../dto/credit-wallet.dto';

@Injectable()
export class PurchasedCreditService {
  constructor(private readonly creditService: CreditService) {}

  allocatePurchasedCredits(userId: string, body: AllocatePurchasedCreditsDto) {
    return this.creditService.allocatePurchasedCredits(userId, body);
  }

  buyPurchasedCredits(userId: string, body: BuyPurchasedCreditsDto) {
    return this.creditService.buyPurchasedCredits(userId, body);
  }

  getPurchasedCreditsAfterCheckout(userId: string, sessionId: string) {
    return this.creditService.getPurchasedCreditsAfterCheckout(
      userId,
      sessionId,
    );
  }

  handlePurchasedCreditWebhook(rawBody: Buffer, signature: string) {
    return this.creditService.handlePurchasedCreditWebhook(rawBody, signature);
  }
}
