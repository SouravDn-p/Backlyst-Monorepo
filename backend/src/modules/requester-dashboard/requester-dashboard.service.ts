import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { calculateRate } from '../provider-dashboard/utils/dashboard-rate.util';
import {
  GetRequesterDashboardSummaryQueryDto,
  RequesterDashboardRange,
} from './dto/get-requester-dashboard-summary-query.dto';

type DateRangeMeta = {
  range: RequesterDashboardRange | 'custom';
  from: Date | null;
  to: Date | null;
};

@Injectable()
export class RequesterDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    requesterId: string,
    query: GetRequesterDashboardSummaryQueryDto,
  ) {
    const dateRange = this.resolveDateRange(query);
    const website = await this.validateRequesterWebsite(
      requesterId,
      query.websiteId,
    );
    const taskWhere = this.buildTaskWhere(requesterId, website?.id, dateRange);
    const creditWhere = this.buildTaskSpendWhere(
      requesterId,
      website?.id,
      dateRange,
    );

    const [totalCreated, groupedTasks, lateTasks, spendLogs] =
      await Promise.all([
        this.prisma.placementTask.count({ where: taskWhere }),
        this.prisma.placementTask.groupBy({
          by: ['lifecycleStatus'],
          where: taskWhere,
          _count: { _all: true },
        }),
        this.prisma.placementTask.count({
          where: {
            ...taskWhere,
            isLate: true,
          },
        }),
        this.prisma.creditLog.findMany({
          where: creditWhere,
          select: {
            amount: true,
            creditType: true,
            note: true,
          },
        }),
      ]);

    const taskCounts = this.toStatusCountMap(groupedTasks);
    const tasks = {
      created: totalCreated,
      open: taskCounts.OPEN ?? 0,
      waitingForApplicants: taskCounts.WAITING_FOR_APPLICANTS ?? 0,
      assigned: taskCounts.ASSIGNED ?? 0,
      inProgress: taskCounts.IN_PROGRESS ?? 0,
      submitted: taskCounts.SUBMITTED ?? 0,
      revisionRequested: taskCounts.REVISION_REQUESTED ?? 0,
      approved: taskCounts.APPROVED ?? 0,
      completed: taskCounts.COMPLETED ?? 0,
      cancelled: taskCounts.CANCELLED ?? 0,
      disputed: taskCounts.DISPUTED ?? 0,
      expired: taskCounts.EXPIRED ?? 0,
      frozen: taskCounts.FROZEN ?? 0,
      lateTasks,
    };

    const spend = this.buildSpendSummary(spendLogs);
    const reviewedTasks =
      tasks.completed + tasks.revisionRequested + tasks.disputed;

    const performance = {
      completionRate: calculateRate(tasks.completed, tasks.created),
      disputeRate: calculateRate(tasks.disputed, tasks.created),
      cancellationRate: calculateRate(tasks.cancelled, tasks.created),
      approvalRate: calculateRate(tasks.completed, reviewedTasks),
    };

    return sendResponse('Requester dashboard summary fetched successfully.', {
      tasks,
      spend,
      performance,
      meta: {
        requesterId,
        websiteId: website?.id ?? null,
        range: dateRange.range,
        from: dateRange.from,
        to: dateRange.to,
      },
    });
  }

  private async validateRequesterWebsite(
    requesterId: string,
    websiteId?: string,
  ) {
    if (!websiteId) {
      return null;
    }

    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,
        authorId: requesterId,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Requester website not found.');
    }

    return website;
  }

  private resolveDateRange(
    query: GetRequesterDashboardSummaryQueryDto,
  ): DateRangeMeta {
    const explicit = this.resolveExplicitDateRange(query.from, query.to);
    if (explicit.from || explicit.to) {
      return {
        range: 'custom',
        from: explicit.from,
        to: explicit.to,
      };
    }

    const range = query.range ?? RequesterDashboardRange.THIRTY_DAYS;
    if (range === RequesterDashboardRange.ALL) {
      return { range, from: null, to: null };
    }

    const to = new Date();
    const from = new Date(to);
    const rangeDays =
      range === RequesterDashboardRange.SEVEN_DAYS
        ? 7
        : range === RequesterDashboardRange.NINETY_DAYS
          ? 90
          : 30;
    from.setDate(from.getDate() - rangeDays);

    return { range, from, to };
  }

  private resolveExplicitDateRange(fromRaw?: string, toRaw?: string) {
    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;

    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException('from must be a valid date');
    }

    if (to && Number.isNaN(to.getTime())) {
      throw new BadRequestException('to must be a valid date');
    }

    if (from && to && from > to) {
      throw new BadRequestException('from must be before to');
    }

    return { from, to };
  }

  private buildTaskWhere(
    requesterId: string,
    websiteId: string | undefined,
    dateRange: DateRangeMeta,
  ): Prisma.PlacementTaskWhereInput {
    return {
      requesterId,
      ...(websiteId ? { requesterWebsiteId: websiteId } : {}),
      ...(dateRange.from || dateRange.to
        ? {
            createdAt: {
              ...(dateRange.from ? { gte: dateRange.from } : {}),
              ...(dateRange.to ? { lte: dateRange.to } : {}),
            },
          }
        : {}),
    };
  }

  private buildTaskSpendWhere(
    requesterId: string,
    websiteId: string | undefined,
    dateRange: DateRangeMeta,
  ): Prisma.CreditLogWhereInput {
    return {
      userId: requesterId,
      action: 'SPEND',
      reason: 'TASK_POST',
      ...(websiteId ? { websiteId } : {}),
      ...(dateRange.from || dateRange.to
        ? {
            createdAt: {
              ...(dateRange.from ? { gte: dateRange.from } : {}),
              ...(dateRange.to ? { lte: dateRange.to } : {}),
            },
          }
        : {}),
    };
  }

  private toStatusCountMap(
    rows: Array<{ lifecycleStatus: string; _count: { _all: number } }>,
  ) {
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.lifecycleStatus] = row._count._all;
      return acc;
    }, {});
  }

  private buildSpendSummary(
    logs: Array<{ amount: number; creditType: string; note: string | null }>,
  ) {
    const summary = {
      totalTaskCreditsSpent: 0,
      subscriptionCreditsSpent: 0,
      purchasedCreditsSpent: 0,
      referralCreditsSpent: 0,
      earnedCreditsSpent: 0,
    };

    for (const log of logs) {
      summary.totalTaskCreditsSpent += log.amount;
      const note = log.note?.toLowerCase() ?? '';

      if (log.creditType === 'SUBSCRIPTION_TASK') {
        summary.subscriptionCreditsSpent += log.amount;
      } else if (note.includes('purchased')) {
        summary.purchasedCreditsSpent += log.amount;
      } else if (note.includes('referral')) {
        summary.referralCreditsSpent += log.amount;
      } else {
        summary.earnedCreditsSpent += log.amount;
      }
    }

    return summary;
  }
}
