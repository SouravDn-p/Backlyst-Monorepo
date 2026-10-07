import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AdminComplianceService } from './admin-compliance.service';
import { AdminComplianceQueryDto } from './dto/admin-compliance-query.dto';

@ApiTags('Admin Dashboard - Compliance & Governance')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/dashboard/compliance')
export class AdminComplianceController {
  constructor(
    private readonly adminComplianceService: AdminComplianceService,
  ) {}

  @Get('consents')
  @ApiOperation({ summary: 'Get user legal-consent records' })
  getConsentRecords(@Query() query: AdminComplianceQueryDto) {
    return this.adminComplianceService.getConsentRecords(query);
  }

  @Get('governance-records')
  @ApiOperation({ summary: 'Get account governance-note records' })
  getGovernanceRecords(@Query() query: AdminComplianceQueryDto) {
    return this.adminComplianceService.getGovernanceRecords(query);
  }

  @Get('abuse-reports')
  @ApiOperation({ summary: 'Get message abuse and policy-violation reports' })
  getAbuseReports(@Query() query: AdminComplianceQueryDto) {
    return this.adminComplianceService.getAbuseReports(query);
  }

  @Get('task-disputes')
  @ApiOperation({ summary: 'Get task dispute, freeze, and abuse-flow events' })
  getTaskDisputes(@Query() query: AdminComplianceQueryDto) {
    return this.adminComplianceService.getTaskDisputes(query);
  }

  @Get('financial-records')
  @ApiOperation({
    summary: 'Get existing subscription and paid-credit ledger records',
  })
  getFinancialRecords(@Query() query: AdminComplianceQueryDto) {
    return this.adminComplianceService.getFinancialRecords(query);
  }
}
