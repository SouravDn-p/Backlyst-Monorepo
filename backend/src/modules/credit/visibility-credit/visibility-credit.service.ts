import { Injectable } from '@nestjs/common';
import { CreditService } from '../credit.service';
import { CreditStatementQueryDto } from '../dto/credit-statement-query.dto';
import {
  AllocateVisibilityCreditsDto,
  BuyVisibilityCreditsDto,
} from '../dto/credit-wallet.dto';

@Injectable()
export class VisibilityCreditService {
  constructor(private readonly creditService: CreditService) {}

  buyVisibilityCredits(userId: string, body: BuyVisibilityCreditsDto) {
    return this.creditService.buyVisibilityCredits(userId, body);
  }

  allocateVisibilityCredits(
    userId: string,
    body: AllocateVisibilityCreditsDto,
  ) {
    return this.creditService.allocateVisibilityCredits(userId, body);
  }

  getVisibilityCreditsAfterCheckout(userId: string, sessionId: string) {
    return this.creditService.getVisibilityCreditsAfterCheckout(
      userId,
      sessionId,
    );
  }

  handleVisibilityCreditWebhook(rawBody: Buffer, signature: string) {
    return this.creditService.handleVisibilityCreditWebhook(rawBody, signature);
  }

  getVisibilityCredits(userId: string) {
    return this.creditService.getVisibilityCredits(userId);
  }

  getVisibilityStatement(userId: string, query: CreditStatementQueryDto) {
    return this.creditService.getVisibilityStatement(userId, query);
  }
}
