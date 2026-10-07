import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { getPagination } from 'src/common/utils/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AnalyticsDateRangeService } from './analytics-date-range.service';
import {
  AnalyticsParticipant,
  AnalyticsRange,
  AnalyticsReportStatus,
  AnalyticsReportType,
  SortOrder,
} from '../enums/analytics.enums';
import { getAnalyticsReportDefinition } from '../registry/analytics-report.registry';
import { CreateSavedAnalyticsReportDto } from '../dto/create-saved-analytics-report.dto';
import { SavedAnalyticsReportListQueryDto } from '../dto/saved-analytics-report-list-query.dto';
import { UpdateSavedAnalyticsReportDto } from '../dto/update-saved-analytics-report.dto';

@Injectable()
export class SavedAnalyticsReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAnalyticsService: AdminAnalyticsService,
    private readonly dateRangeService: AnalyticsDateRangeService,
  ) {}

  async create(dto: CreateSavedAnalyticsReportDto, adminId: string) {
    const saved = await this.createSnapshot(dto, adminId);
    return sendResponse('Admin analytics report saved successfully', saved);
  }

  async list(query: SavedAnalyticsReportListQueryDto) {
    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { reportCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.reportType) where.reportType = query.reportType;
    if (query.status) where.status = query.status;

    if (query.generatedFrom || query.generatedTo) {
      const from = query.generatedFrom
        ? new Date(query.generatedFrom)
        : undefined;
      const to = query.generatedTo ? new Date(query.generatedTo) : undefined;
      if (from && to && from > to) {
        throw new BadRequestException(
          'generatedFrom must be before generatedTo',
        );
      }
      where.generatedAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const total = await this.prisma.adminAnalyticsReport.count({ where });
    const pagination = getPagination(query.page, query.limit, total);
    const data = await this.prisma.adminAnalyticsReport.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: {
        [query.sortBy ?? 'generatedAt']: query.sortOrder ?? SortOrder.DESC,
      },
      select: {
        id: true,
        reportCode: true,
        name: true,
        description: true,
        reportType: true,
        period: true,
        dateFrom: true,
        dateTo: true,
        participant: true,
        totalRecords: true,
        status: true,
        generatedAt: true,
        generatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return sendResponse('Saved analytics reports fetched successfully', {
      data,
      meta: pagination.meta,
    });
  }

  async getById(id: string) {
    const report = await this.findActiveReport(id);
    return sendResponse('Saved analytics report fetched successfully', report);
  }

  async update(id: string, dto: UpdateSavedAnalyticsReportDto) {
    await this.findActiveReport(id);
    const updated = await this.prisma.adminAnalyticsReport.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
    });
    return sendResponse('Saved analytics report updated successfully', updated);
  }

  async delete(id: string) {
    await this.findActiveReport(id);
    await this.prisma.adminAnalyticsReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return sendResponse('Saved analytics report deleted successfully');
  }

  async regenerate(id: string, adminId: string) {
    const report = await this.findActiveReport(id);
    const filters = (report.filters ?? {}) as {
      range?: AnalyticsRange;
      from?: string | null;
      to?: string | null;
      participant?: AnalyticsParticipant;
    };
    const range = (filters.range ?? report.period) as AnalyticsRange;

    const saved = await this.createSnapshot(
      {
        name: `${report.name} (Regenerated)`,
        description: report.description ?? undefined,
        reportType: report.reportType as unknown as AnalyticsReportType,
        range,
        from:
          range === AnalyticsRange.CUSTOM
            ? (filters.from ?? undefined)
            : undefined,
        to:
          range === AnalyticsRange.CUSTOM
            ? (filters.to ?? undefined)
            : undefined,
        participant: (filters.participant ??
          report.participant) as AnalyticsParticipant,
      },
      adminId,
    );

    return sendResponse(
      'Saved analytics report regenerated successfully',
      saved,
    );
  }

  async getRawActiveReport(id: string) {
    return this.findActiveReport(id);
  }

  private async createSnapshot(
    dto: CreateSavedAnalyticsReportDto,
    adminId: string,
  ) {
    const definition = getAnalyticsReportDefinition(dto.reportType);
    if (!definition)
      throw new BadRequestException('Unsupported analytics report type');

    const range = dto.range ?? AnalyticsRange.MONTHLY;
    const participant = dto.participant ?? AnalyticsParticipant.ALL;
    const period = this.dateRangeService.resolve(range, dto.from, dto.to);
    const snapshot =
      dto.reportType === AnalyticsReportType.FULL_PLATFORM_SUMMARY
        ? await this.adminAnalyticsService.buildLiveReport(dto.reportType, {
            range,
            from: dto.from,
            to: dto.to,
            participant,
          })
        : await this.adminAnalyticsService.buildLiveReport(dto.reportType, {
            range,
            from: dto.from,
            to: dto.to,
            participant,
          });

    const generatedAt = new Date();
    const name =
      dto.name ??
      `${definition.name} ${period.range} ${generatedAt.toISOString().slice(0, 19)}Z`;

    return this.prisma.adminAnalyticsReport.create({
      data: {
        reportCode: this.generateReportCode(generatedAt),
        name,
        description: dto.description ?? null,
        reportType: dto.reportType,
        period: period.range,
        dateFrom: period.from,
        dateTo: period.to,
        participant,
        filters: {
          range,
          from: dto.from ?? null,
          to: dto.to ?? null,
          participant,
        },
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        snapshotVersion: 1,
        totalRecords: snapshot.metadata?.totalRecords ?? 0,
        status: AnalyticsReportStatus.READY,
        generatedById: adminId,
        generatedAt,
      },
      include: {
        generatedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  private async findActiveReport(id: string) {
    const report = await this.prisma.adminAnalyticsReport.findFirst({
      where: { id, deletedAt: null },
      include: {
        generatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!report)
      throw new NotFoundException('Saved analytics report not found');
    return report;
  }

  private generateReportCode(date: Date) {
    const stamp = date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, '')
      .replace('T', '-');
    return `ANR-${stamp}-${randomBytes(2).toString('hex').toUpperCase()}`;
  }
}
