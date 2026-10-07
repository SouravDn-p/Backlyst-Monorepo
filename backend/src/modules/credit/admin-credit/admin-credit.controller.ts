import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AdminCreditService } from './admin-credit.service';

@AdminGuard()
@ApiTags('Admin - Credits')
@ApiBearerAuth(ACCESS_TOKEN)
@Controller('admin-credits')
export class AdminCreditController {
  constructor(private readonly adminCreditService: AdminCreditService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get platform credit overview for admin dashboard',
  })
  getOverview() {
    return this.adminCreditService.getOverview();
  }

  @Get('wallets/users/:userId')
  @ApiOperation({
    summary: 'Get master credit wallet profile for a user',
  })
  getUserWallet(@Param('userId') userId: string) {
    return this.adminCreditService.getUserWallet(userId);
  }

  @Get('wallets/websites/:websiteId')
  @ApiOperation({
    summary: 'Get credit wallet profile for a website',
  })
  getWebsiteWallet(@Param('websiteId') websiteId: string) {
    return this.adminCreditService.getWebsiteWallet(websiteId);
  }
}
