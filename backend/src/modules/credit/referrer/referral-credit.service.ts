import { Injectable } from '@nestjs/common';
import { CreditService } from '../credit.service';
import { AllocateReferralCreditsDto } from '../dto/credit-wallet.dto';

@Injectable()
export class ReferralCreditService {
  constructor(private readonly creditService: CreditService) {}

  allocateReferralCredits(userId: string, body: AllocateReferralCreditsDto) {
    return this.creditService.allocateReferralCredits(userId, body);
  }
}
