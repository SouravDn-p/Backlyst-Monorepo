import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import {
  AdminReferralActionDto,
  ApproveReferralCreditDto,
  DisableEntityReferralsDto,
} from './dto/admin-referral-action.dto';
import { AdminReferralRegistryQueryDto } from './dto/admin-referral-query.dto';
import { AdminReferralService } from './admin-referral.service';

@ApiTags('Admin Referrals')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/referrals')
export class AdminReferralController {
  constructor(private readonly adminReferralService: AdminReferralService) {}

  @Get('registry')
  @ApiOperation({
    summary: 'Get referral attribution registry rows for admin panel',
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated referral attribution rows with referrer, referred entity, credit, status, conversion, and oversight endpoint.',
  })
  getReferralRegistry(@Query() query: AdminReferralRegistryQueryDto) {
    return this.adminReferralService.getReferralRegistry(query);
  }

  @Get(':referralId')
  @ApiOperation({
    summary: 'Get referral credit details for the admin oversight modal',
  })
  @ApiParam({
    name: 'referralId',
    description: 'UserReferral id from the registry row.',
  })
  getReferralDetails(@Param('referralId') referralId: string) {
    return this.adminReferralService.getReferralDetails(referralId);
  }

  @Post(':referralId/approve-credit')
  @ApiOperation({ summary: 'Approve referral credit after admin review' })
  @ApiParam({ name: 'referralId', type: String })
  approveReferralCredit(
    @Param('referralId') referralId: string,
    @CurrentUser('id') adminId: string,
    @Body() payload: ApproveReferralCreditDto,
  ) {
    return this.adminReferralService.approveReferralCredit(
      referralId,
      adminId,
      payload,
    );
  }

  @Post(':referralId/revoke-credit')
  @ApiOperation({ summary: 'Revoke referral credit and reverse settlement' })
  @ApiParam({ name: 'referralId', type: String })
  revokeReferralCredit(
    @Param('referralId') referralId: string,
    @CurrentUser('id') adminId: string,
    @Body() payload: AdminReferralActionDto,
  ) {
    return this.adminReferralService.revokeReferralCredit(
      referralId,
      adminId,
      payload,
    );
  }

  @Post(':referralId/disable-entity-referrals')
  @ApiOperation({
    summary:
      'Disable future referral activity for the referrer or referred user',
  })
  @ApiParam({ name: 'referralId', type: String })
  disableEntityReferrals(
    @Param('referralId') referralId: string,
    @CurrentUser('id') adminId: string,
    @Body() payload: DisableEntityReferralsDto,
  ) {
    return this.adminReferralService.disableEntityReferrals(
      referralId,
      adminId,
      payload,
    );
  }

  @Post('freeze')
  @ApiOperation({
    summary: 'Emergency freeze or unfreeze all referral activity',
  })
  freezeReferralProgram(
    @CurrentUser('id') adminId: string,
    @Body() payload: AdminReferralActionDto,
  ) {
    return this.adminReferralService.freezeReferralProgram(adminId, payload);
  }
}
