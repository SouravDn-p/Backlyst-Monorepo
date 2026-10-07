import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import {
  AdminShowcaseListQueryDto,
  CreateShowcaseEntryDto,
  RankingRecalculateDto,
  ShowcaseStatsRefreshDto,
  UpdateShowcaseEntryDto,
} from './dto';
import { AdminShowcaseManagementService } from './services/admin-showcase-management.service';

@ApiTags('Community Showcase - Admin')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/community/showcase')
export class AdminCommunityShowcaseController {
  constructor(
    private readonly adminShowcaseManagementService: AdminShowcaseManagementService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get admin community showcase entries' })
  @ApiQuery({ name: 'section', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'isVisible', required: false, type: Boolean })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listEntries(@Query() query: AdminShowcaseListQueryDto) {
    return this.adminShowcaseManagementService.listEntries(query);
  }

  @Post('entries')
  @ApiOperation({ summary: 'Create community showcase entry' })
  @ApiBody({ type: CreateShowcaseEntryDto })
  createEntry(
    @Body() dto: CreateShowcaseEntryDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminShowcaseManagementService.createEntry(dto, adminId);
  }

  @Patch('entries/:id')
  @ApiOperation({ summary: 'Update community showcase entry' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateShowcaseEntryDto })
  updateEntry(
    @Param('id') id: string,
    @Body() dto: UpdateShowcaseEntryDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminShowcaseManagementService.updateEntry(id, dto, adminId);
  }

  @Delete('entries/:id')
  @ApiOperation({ summary: 'Hide one community showcase entry' })
  @ApiParam({ name: 'id', type: String })
  hideEntry(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.adminShowcaseManagementService.hideEntry(id, adminId);
  }

  @Post('rankings/recalculate')
  @ApiOperation({ summary: 'Recalculate community ranking snapshots' })
  @ApiBody({ type: RankingRecalculateDto, required: false })
  recalculateRankings(
    @Body() dto: RankingRecalculateDto = new RankingRecalculateDto(),
  ) {
    return this.adminShowcaseManagementService.recalculateRankings(dto);
  }

  @Post('stats/refresh')
  @ApiOperation({ summary: 'Refresh community showcase stats tables' })
  @ApiBody({ type: ShowcaseStatsRefreshDto, required: false })
  refreshStats(
    @Body() dto: ShowcaseStatsRefreshDto = new ShowcaseStatsRefreshDto(),
  ) {
    return this.adminShowcaseManagementService.refreshStats(dto);
  }
}
