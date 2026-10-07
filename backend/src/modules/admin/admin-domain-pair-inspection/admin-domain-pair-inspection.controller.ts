import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AdminDomainPairInspectionService } from './admin-domain-pair-inspection.service';
import { InspectDomainPairQueryDto } from './dto/admin-domain-pair-inspection.dto';

@ApiTags('Admin Domain Pair Inspection')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/domain-pair-inspection')
export class AdminDomainPairInspectionController {
  constructor(
    private readonly adminDomainPairInspectionService: AdminDomainPairInspectionService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Inspect a marketplace domain pair (spec §22 / M-20): cooldowns, interaction count, and recent interactions',
  })
  @ApiOkResponse({
    description:
      'Domain pair aggregate (DomainPairStat) plus recent raw DomainInteraction rows.',
  })
  inspect(@Query() query: InspectDomainPairQueryDto) {
    return this.adminDomainPairInspectionService.inspect(query);
  }
}
