import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { ManualMatchQueueService } from './manual-match-queue.service';
import {
  EnqueueManualMatchDto,
  ListManualMatchQueueDto,
  ResolveManualMatchDto,
} from './dto/manual-match-queue.dto';

@ApiTags('Admin Manual Match Queue')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/manual-match-queue')
export class AdminManualMatchQueueController {
  constructor(
    private readonly manualMatchQueueService: ManualMatchQueueService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List manual match queue entries (spec §18 / §21)',
    description:
      'Returns paginated manual match queue entries with optional status / taskId filters. Surfaces persistent LOW_POOL matches queued for admin review.',
  })
  @ApiOkResponse({ description: 'Manual match queue entries' })
  list(@Query() query: ListManualMatchQueueDto) {
    return this.manualMatchQueueService.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Enqueue a manual match (admin injection)',
    description:
      'Admin injects a candidate match for a requester task / provider website pair that the matching engine could not surface under LOW_POOL.',
  })
  @ApiOkResponse({ description: 'Manual match queued' })
  enqueue(
    @CurrentUser('id') adminId: string,
    @Body() dto: EnqueueManualMatchDto,
  ) {
    return this.manualMatchQueueService.enqueue(adminId, dto);
  }

  @Post(':id/resolve')
  @ApiOperation({
    summary:
      'Resolve a manual match queue entry (APPLIED / RESOLVED / CANCELLED)',
    description:
      'Admin finalises a queued manual match. Terminal rows cannot be changed.',
  })
  @ApiParam({ name: 'id', description: 'ManualMatchQueue entry id.' })
  @ApiOkResponse({ description: 'Manual match queue entry resolved' })
  resolve(
    @CurrentUser('id') adminId: string,
    @Param('id') queueId: string,
    @Body() dto: ResolveManualMatchDto,
  ) {
    return this.manualMatchQueueService.resolve(queueId, adminId, dto);
  }
}
