import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { AllocateReferralCreditsDto } from '../dto/credit-wallet.dto';
import { ReferralCreditService } from './referral-credit.service';

@ApiTags('Referral Credits')
@Controller('credits/referral')
export class ReferralCreditController {
  constructor(private readonly referralCreditService: ReferralCreditService) {}

  @Post('allocate')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Allocate referral credits from master wallet to website wallet',
  })
  @ApiResponse({
    status: 200,
    description:
      'Referral credits moved from the user master wallet into one owned website wallet',
    schema: {
      example: {
        success: true,
        websiteId: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
        allocatedAmount: 2,
        masterReferralTaskCredits: 4,
        websiteAllocatedReferralCredits: 3,
      },
    },
  })
  allocateReferralCredits(
    @CurrentUser('id') userId: string,
    @Body() body: AllocateReferralCreditsDto,
  ) {
    return this.referralCreditService.allocateReferralCredits(userId, body);
  }
}
