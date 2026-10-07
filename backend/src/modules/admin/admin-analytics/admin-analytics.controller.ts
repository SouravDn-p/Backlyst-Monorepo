import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import type { JwtPayload } from 'src/types';
import { sendResponse } from 'src/utils/sendResponse';
import {
  AdminAnalyticsGenericResponseDto,
  AdminAnalyticsQueryDto,
  AdminAnalyticsRegistryQueryDto,
} from './dto/admin-analytics-query.dto';
import { AnalyticsExportQueryDto } from './dto/analytics-export-query.dto';
import { CreateSavedAnalyticsReportDto } from './dto/create-saved-analytics-report.dto';
import { MarketplaceLiquidityDto } from './dto/marketplace-liquidity.dto';
import { SavedAnalyticsReportListQueryDto } from './dto/saved-analytics-report-list-query.dto';
import { UpdateSavedAnalyticsReportDto } from './dto/update-saved-analytics-report.dto';
import { AnalyticsReportType } from './enums/analytics.enums';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AnalyticsExportService } from './services/analytics-export.service';
import { LiquidityService } from './services/liquidity.service';
import { PatternFlagService } from './services/pattern-flag.service';
import { SavedAnalyticsReportService } from './services/saved-analytics-report.service';
import { PatternFlagQueryDto } from './dto/pattern-flag-query.dto';
import { ResolvePatternFlagDto } from './dto/resolve-pattern-flag.dto';
import {
  MarketplaceAnalyticsDashboardService,
  MarketplaceAnalyticsQuery,
} from './marketplace-analytics-dashboard.service';
import { NotificationMetricsService } from 'src/modules/notification/notification-metrics.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { getPagination } from 'src/common/utils/pagination';

@ApiTags('Admin Analytics')
@ApiBearerAuth(ACCESS_TOKEN)
@ApiUnauthorizedResponse({ description: 'Authentication required.' })
@ApiForbiddenResponse({ description: 'Admin access required.' })
@ApiInternalServerErrorResponse({ description: 'Unexpected analytics error.' })
@AdminGuard()
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(
    private readonly adminAnalyticsService: AdminAnalyticsService,
    private readonly savedReportService: SavedAnalyticsReportService,
    private readonly exportService: AnalyticsExportService,
    private readonly liquidityService: LiquidityService,
    private readonly patternFlagService: PatternFlagService,
    private readonly marketplaceAnalyticsService: MarketplaceAnalyticsDashboardService,
    private readonly notificationMetricsService: NotificationMetricsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('marketplace-liquidity')
  @ApiOperation({ summary: 'Marketplace supply vs demand liquidity snapshot' })
  @ApiOkResponse({
    description:
      'Returns supply/demand ratios and LOW_SUPPLY/LOW_DEMAND flags.',
    type: MarketplaceLiquidityDto,
  })
  getMarketplaceLiquidity() {
    return this.liquidityService.getLiquiditySnapshot();
  }

  @Get('notifications/metrics')
  @ApiOperation({ summary: 'Notification delivery metrics' })
  @ApiOkResponse({
    description:
      'Returns in-memory notification delivery metrics for the last 24h, 7d, 30d.',
  })
  getNotificationMetrics() {
    return sendResponse(
      'Notification metrics retrieved.',
      this.notificationMetricsService.getDeliveryMetrics(),
    );
  }
  @Get('domain-pairs/:pairKey')
  @ApiOperation({ summary: 'Inspect a domain pair for abuse investigation' })
  @ApiParam({
    name: 'pairKey',
    description: 'Normalized domain pair key (e.g., example1.com:example2.com)',
  })
  @ApiOkResponse({
    description: 'Returns pair stats, recent interactions, and pattern flags.',
  })
  inspectDomainPair(@Param('pairKey') pairKey: string) {
    return this.adminAnalyticsService.inspectDomainPair(pairKey);
  }

  @Get('pattern-flags')
  @ApiOperation({ summary: 'List coordinated-exchange pattern flags' })
  @ApiOkResponse({
    description: 'Returns PatternFlag rows ordered by createdAt desc.',
  })
  listPatternFlags(@Query() query: PatternFlagQueryDto) {
    return sendResponse(
      'Pattern flags retrieved.',
      this.patternFlagService.list({
        status: query.status,
        type: query.type,
      }),
    );
  }

  @Patch('pattern-flags/:id/resolve')
  @ApiOperation({ summary: 'Resolve a coordinated-exchange pattern flag' })
  @ApiParam({ name: 'id', example: 'pattern-flag-id' })
  @ApiBody({ type: ResolvePatternFlagDto })
  @ApiOkResponse({
    description: 'Pattern flag resolved by the current admin.',
  })
  @ApiNotFoundResponse({ description: 'Pattern flag not found.' })
  resolvePatternFlag(
    @Param('id') id: string,
    @Body() dto: ResolvePatternFlagDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return sendResponse(
      'Pattern flag resolved.',
      this.patternFlagService.resolve(id, user.id, dto.note),
    );
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Get admin analytics overview cards',
    description:
      'Returns marketplace supply/workload, platform credit-unit economy, settlement speed, and task health/risk cards. Active tasks exclude completed, cancelled, expired, rejected, approved, disputed, and frozen statuses.',
  })
  @ApiOkResponse({ type: AdminAnalyticsGenericResponseDto })
  getOverview(@Query() query: AdminAnalyticsQueryDto) {
    return this.adminAnalyticsService.getOverview(query);
  }

  @Get('report-registry')
  @ApiOperation({
    summary: 'Get fixed admin analytics report registry',
    description:
      'Returns fixed report definitions plus live total-record counts and latest saved report metadata. FULL_PLATFORM_SUMMARY is available for exports/saved reports but is not listed as a normal component row.',
  })
  @ApiOkResponse({ type: AdminAnalyticsGenericResponseDto })
  getReportRegistry(@Query() query: AdminAnalyticsRegistryQueryDto) {
    return this.adminAnalyticsService.getReportRegistry(query);
  }

  @Get('export/all/pdf')
  @ApiOperation({
    summary: 'Export all live analytics reports as PDF',
    description:
      'Generates a read-only aggregated PDF from current live filters. This endpoint returns binary PDF and does not use the JSON response wrapper.',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async exportAllLivePdf(
    @Query() query: AnalyticsExportQueryDto,
    @Res() res: Response,
  ) {
    const reports = await this.adminAnalyticsService.buildAllLiveReports(query);
    const buffer = await this.exportService.toPdf(
      reports,
      'Backlyst Full Analytics Summary',
    );
    this.sendBinary(
      res,
      buffer,
      'application/pdf',
      this.exportService.liveFilename('all-analytics', 'pdf'),
    );
  }

  @Get('export/all/csv')
  @ApiOperation({
    summary: 'Export all live analytics reports as CSV',
    description:
      'Generates one normalized CSV with reportType, section, metric, value, period and timestamp columns.',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async exportAllLiveCsv(
    @Query() query: AnalyticsExportQueryDto,
    @Res() res: Response,
  ) {
    const reports = await this.adminAnalyticsService.buildAllLiveReports(query);
    const buffer = this.exportService.toCsv(reports);
    this.sendBinary(
      res,
      buffer,
      'text/csv; charset=utf-8',
      this.exportService.liveFilename('all-analytics', 'csv'),
    );
  }

  @Get('saved-reports/:id/export/pdf')
  @ApiOperation({
    summary: 'Export one saved analytics report snapshot as PDF',
    description:
      'Uses the immutable saved snapshot and does not query live analytics data again.',
  })
  @ApiParam({ name: 'id', example: 'analytics-report-id' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: 'Saved report not found.' })
  async exportSavedPdf(@Param('id') id: string, @Res() res: Response) {
    const report = await this.savedReportService.getRawActiveReport(id);
    const buffer = await this.exportService.toPdf(
      [report.snapshot],
      report.name,
    );
    this.sendBinary(
      res,
      buffer,
      'application/pdf',
      this.exportService.savedFilename(report, 'pdf'),
    );
  }

  @Get('saved-reports/:id/export/csv')
  @ApiOperation({
    summary: 'Export one saved analytics report snapshot as CSV',
    description:
      'Uses the immutable saved snapshot and does not query live analytics data again.',
  })
  @ApiParam({ name: 'id', example: 'analytics-report-id' })
  @ApiProduces('text/csv')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: 'Saved report not found.' })
  async exportSavedCsv(@Param('id') id: string, @Res() res: Response) {
    const report = await this.savedReportService.getRawActiveReport(id);
    const buffer = this.exportService.toCsv([report.snapshot]);
    this.sendBinary(
      res,
      buffer,
      'text/csv; charset=utf-8',
      this.exportService.savedFilename(report, 'csv'),
    );
  }

  @Get('export/:reportType/pdf')
  @ApiOperation({ summary: 'Export one live analytics report as PDF' })
  @ApiParam({ name: 'reportType', enum: AnalyticsReportType })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiBadRequestResponse({
    description: 'Unsupported report type or invalid filter.',
  })
  async exportLivePdf(
    @Param('reportType') reportType: AnalyticsReportType,
    @Query() query: AnalyticsExportQueryDto,
    @Res() res: Response,
  ) {
    this.assertReportType(reportType);
    const report = await this.adminAnalyticsService.buildLiveReport(
      reportType,
      query,
    );
    const buffer = await this.exportService.toPdf(
      [report],
      report.metadata.reportName,
    );
    this.sendBinary(
      res,
      buffer,
      'application/pdf',
      this.exportService.liveFilename(reportType, 'pdf'),
    );
  }

  @Get('export/:reportType/csv')
  @ApiOperation({ summary: 'Export one live analytics report as CSV' })
  @ApiParam({ name: 'reportType', enum: AnalyticsReportType })
  @ApiProduces('text/csv')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiBadRequestResponse({
    description: 'Unsupported report type or invalid filter.',
  })
  async exportLiveCsv(
    @Param('reportType') reportType: AnalyticsReportType,
    @Query() query: AnalyticsExportQueryDto,
    @Res() res: Response,
  ) {
    this.assertReportType(reportType);
    const report = await this.adminAnalyticsService.buildLiveReport(
      reportType,
      query,
    );
    const buffer = this.exportService.toCsv([report]);
    this.sendBinary(
      res,
      buffer,
      'text/csv; charset=utf-8',
      this.exportService.liveFilename(reportType, 'csv'),
    );
  }

  @Post('saved-reports')
  @ApiOperation({
    summary: 'Generate and save an immutable analytics report snapshot',
    description:
      'Calculates the full report first, then stores a JSON snapshot. Updating later can only change name/description.',
  })
  @ApiBody({ type: CreateSavedAnalyticsReportDto })
  @ApiCreatedResponse({ type: AdminAnalyticsGenericResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid report type or date filters.',
  })
  createSavedReport(
    @Body() dto: CreateSavedAnalyticsReportDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.savedReportService.create(dto, admin.id);
  }

  @Get('saved-reports')
  @ApiOperation({
    summary: 'List saved analytics reports without large snapshots',
  })
  @ApiOkResponse({ type: AdminAnalyticsGenericResponseDto })
  listSavedReports(@Query() query: SavedAnalyticsReportListQueryDto) {
    return this.savedReportService.list(query);
  }

  @Post('saved-reports/:id/regenerate')
  @ApiOperation({
    summary: 'Regenerate a saved analytics report',
    description:
      'Uses the saved report original filters and creates a new immutable snapshot record.',
  })
  @ApiParam({ name: 'id', example: 'analytics-report-id' })
  @ApiCreatedResponse({ type: AdminAnalyticsGenericResponseDto })
  @ApiNotFoundResponse({ description: 'Saved report not found.' })
  regenerateSavedReport(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.savedReportService.regenerate(id, admin.id);
  }

  @Get('saved-reports/:id')
  @ApiOperation({
    summary: 'Get one saved analytics report with immutable snapshot',
  })
  @ApiParam({ name: 'id', example: 'analytics-report-id' })
  @ApiOkResponse({ type: AdminAnalyticsGenericResponseDto })
  @ApiNotFoundResponse({ description: 'Saved report not found.' })
  getSavedReport(@Param('id') id: string) {
    return this.savedReportService.getById(id);
  }

  @Patch('saved-reports/:id')
  @ApiOperation({ summary: 'Update only saved report name and description' })
  @ApiParam({ name: 'id', example: 'analytics-report-id' })
  @ApiBody({ type: UpdateSavedAnalyticsReportDto })
  @ApiOkResponse({ type: AdminAnalyticsGenericResponseDto })
  @ApiNotFoundResponse({ description: 'Saved report not found.' })
  updateSavedReport(
    @Param('id') id: string,
    @Body() dto: UpdateSavedAnalyticsReportDto,
  ) {
    return this.savedReportService.update(id, dto);
  }

  @Delete('saved-reports/:id')
  @ApiOperation({ summary: 'Soft-delete a saved analytics report' })
  @ApiParam({ name: 'id', example: 'analytics-report-id' })
  @ApiOkResponse({ type: AdminAnalyticsGenericResponseDto })
  @ApiNotFoundResponse({ description: 'Saved report not found.' })
  deleteSavedReport(@Param('id') id: string) {
    return this.savedReportService.delete(id);
  }

  @Get('reports/:reportType')
  @ApiOperation({
    summary: 'Get one live analytics report',
    description:
      'Supports all fixed report types plus FULL_PLATFORM_SUMMARY. Credits are platform credit units, not currency.',
  })
  @ApiParam({ name: 'reportType', enum: AnalyticsReportType })
  @ApiOkResponse({ type: AdminAnalyticsGenericResponseDto })
  @ApiBadRequestResponse({
    description: 'Unsupported report type or invalid filter.',
  })
  getReport(
    @Param('reportType') reportType: AnalyticsReportType,
    @Query() query: AdminAnalyticsQueryDto,
  ) {
    this.assertReportType(reportType);
    return this.adminAnalyticsService.getReport(reportType, query);
  }

  @Get('marketplace')
  @ApiOperation({
    summary: 'Get marketplace analytics dashboard',
    description:
      'Returns marketplace health metrics including matching pipeline stats, provider activity, requester behavior, niche health, and conversion funnels.',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    example: '2026-06-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    example: '2026-06-30T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Optional category key filter',
  })
  getMarketplaceAnalytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('category') category?: string,
  ) {
    return this.marketplaceAnalyticsService.getMarketplaceAnalytics({
      dateFrom,
      dateTo,
      category,
    });
  }

  @Get('domain-pairs')
  @ApiOperation({
    summary: 'Get domain pair interaction stats',
    description:
      'Returns paginated list of DomainPairStat records with interaction counts, cooldown status, and associated websites.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['interactionCount', 'lastInteraction'],
    example: 'interactionCount',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by category key',
  })
  async getDomainPairs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('category') category?: string,
  ) {
    const where: any = {};
    if (category) {
      where.OR = [
        { sourcePrimaryCategoryKey: category },
        { targetPrimaryCategoryKey: category },
        { sourceSecondaryCategoryKey: category },
        { targetSecondaryCategoryKey: category },
      ];
    }

    const totalItems = await this.prisma.domainPairStat.count({ where });
    const { skip, take, meta } = getPagination(page, limit, totalItems);

    const orderBy: any =
      sortBy === 'lastInteraction'
        ? { lastInteractionAt: 'desc' }
        : { interactionCount: 'desc' };

    const pairs = await this.prisma.domainPairStat.findMany({
      where,
      skip,
      take,
      orderBy,
    });

    return sendResponse('Domain pair stats retrieved successfully.', {
      items: pairs,
      meta,
    });
  }

  private assertReportType(reportType: AnalyticsReportType) {
    if (!Object.values(AnalyticsReportType).includes(reportType)) {
      throw new BadRequestException('Unsupported analytics report type');
    }
  }

  private sendBinary(
    res: Response,
    buffer: Buffer,
    contentType: string,
    filename: string,
  ) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
