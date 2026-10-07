import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AdminForensicAuditService } from './admin-forensic-audit.service';
import { AdminForensicAuditQueryDto } from './dto/admin-forensic-audit-query.dto';

@ApiTags('Admin Forensic Audit')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/forensic-audit-logs')
export class AdminForensicAuditController {
  constructor(
    private readonly adminForensicAuditService: AdminForensicAuditService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Get authoritative forensic audit ledger log entries for admin dashboard',
    description:
      'Returns a paginated, unified audit log list normalizing credit adjustments, escrow reversals, visibility overrides, and system threshold updates.',
  })
  @ApiOkResponse({
    description: 'Forensic audit ledger items with pagination metadata',
    schema: {
      example: {
        success: true,
        message: 'Forensic audit ledger retrieved successfully.',
        data: {
          items: [
            {
              entryId: 'BK-LOG-908041',
              timestamp: '2026-06-20T14:22:01.000Z',
              authority: {
                code: 'AD-01-BK',
                name: 'SUPER ADMIN',
                adminId: 'admin-uuid-1',
              },
              actionType: 'ESCROW_REVERSAL',
              affectedEntity: {
                type: 'TASK',
                id: 'task-uuid-1004',
                label: 'TASK T-1004',
              },
              registryImpact: 'CREDIT',
              severity: 'CRITICAL',
              traceId: 'trace-uuid-1004',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      },
    },
  })
  getForensicAuditLogs(@Query() query: AdminForensicAuditQueryDto) {
    return this.adminForensicAuditService.getForensicAuditLogs(query);
  }
}
