import { Injectable } from '@nestjs/common';
import { CreditService } from '../credit.service';
import { AllocateSubscriptionCreditsDto } from '../dto/credit-wallet.dto';

@Injectable()
export class SubscriptionCreditService {
  constructor(private readonly creditService: CreditService) {}

  getSubscriptionCredits(userId: string) {
    return this.creditService.getSubscriptionCredits(userId);
  }

  allocateSubscriptionCredits(
    userId: string,
    body: AllocateSubscriptionCreditsDto,
  ) {
    return this.creditService.allocateSubscriptionCredits(userId, body);
  }
}
