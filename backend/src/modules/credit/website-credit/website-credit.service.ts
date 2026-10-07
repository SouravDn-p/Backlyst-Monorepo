import { Injectable } from '@nestjs/common';
import { CreditService } from '../credit.service';
import { CreditStatementQueryDto } from '../dto/credit-statement-query.dto';

@Injectable()
export class WebsiteCreditService {
  constructor(private readonly creditService: CreditService) {}

  getWebsiteCreditSummary(userId: string, websiteId: string) {
    return this.creditService.getWebsiteCreditSummary(userId, websiteId);
  }

  getWebsiteWallet(userId: string, websiteId: string) {
    return this.creditService.getWebsiteWallet(userId, websiteId);
  }

  getWebsiteCreditStatement(
    userId: string,
    websiteId: string,
    query: CreditStatementQueryDto,
  ) {
    return this.creditService.getWebsiteCreditStatement(
      userId,
      websiteId,
      query,
    );
  }
}
