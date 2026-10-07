import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskFlowActorRole, TaskFlowEventType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { GetProviderDashboardActivityQueryDto } from './dto/get-provider-dashboard-activity-query.dto';
import { GetProviderDashboardSummaryQueryDto } from './dto/get-provider-dashboard-summary-query.dto';
import { calculateRate } from './utils/dashboard-rate.util';

type DateRangeMeta = {
  range: '7d' | '30d' | '90d' | 'all' | 'custom';
  from: Date | null;
  to: Date | null;
};

@Injectable()
export class ProviderDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    providerId: string,
    query: GetProviderDashboardSummaryQueryDto,
  ) {
    const dateRange = this.resolveDateRange(query);
    const website = await this.validateProviderWebsite(
      providerId,
      query.websiteId,
    );
    const websiteIds = await this.getProviderWebsiteIds(
      providerId,
      query.websiteId,
    );
    const applicationWhere = this.buildApplicationWhere(
      providerId,
      website?.id,
      dateRange,
    );
    const taskWhere = this.buildTaskWhere(providerId, website?.id, dateRange);
    const contributionWhere = this.buildContributionWhere(
      websiteIds,
      dateRange,
    );

    const [
      totalApplied,
      groupedApplications,
      groupedTasks,
      lateTasks,
      selectedTaskCount,
      milestoneProgressRows,
      contributionRewardsCount,
    ] = await Promise.all([
      this.prisma.placementApplication.count({ where: applicationWhere }),
      this.prisma.placementApplication.groupBy({
        by: ['status'],
        where: applicationWhere,
        _count: { _all: true },
      }),
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
      this.prisma.placementTask.count({
        where: taskWhere,
      }),
      this.prisma.websiteMilestoneProgress.findMany({
        where: {
          websiteId: { in: websiteIds },
        },
        select: {
          websiteId: true,
          totalVerifiedPlacements: true,
          lastMilestoneAtCount: true,
          lastVerifiedPlacementAt: true,
        },
      }),
      this.prisma.websiteWeeklyContribution.count({
        where: contributionWhere,
      }),
    ]);

    const applicationCounts = this.toStatusCountMap(groupedApplications);
    const taskCounts = this.toStatusCountMap(groupedTasks);
    const contribution = this.buildContributionSummary(
      milestoneProgressRows,
      contributionRewardsCount,
    );

    const applications = {
      totalApplied,
      selected: applicationCounts.SELECTED ?? 0,
      rejected: applicationCounts.REJECTED ?? 0,
      pending: applicationCounts.APPLIED ?? 0,
      submitted: applicationCounts.SUBMITTED ?? 0,
      inProgress: applicationCounts.IN_PROGRESS ?? 0,
      completed:
        (applicationCounts.APPROVED ?? 0) + (applicationCounts.COMPLETED ?? 0),
    };

    const tasks = {
      assigned: taskCounts.ASSIGNED ?? 0,
      inProgress: taskCounts.IN_PROGRESS ?? 0,
      submitted: taskCounts.SUBMITTED ?? 0,
      revisionRequested: taskCounts.REVISION_REQUESTED ?? 0,
      completed: taskCounts.COMPLETED ?? 0,
      cancelled: taskCounts.CANCELLED ?? 0,
      disputed: taskCounts.DISPUTED ?? 0,
      expired: taskCounts.EXPIRED ?? 0,
      lateTasks,
    };

    const reviewedTasks =
      tasks.completed + tasks.revisionRequested + tasks.disputed;
    const submittedTasks =
      tasks.submitted +
      tasks.completed +
      tasks.revisionRequested +
      tasks.disputed;

    const performance = {
      approvalRate: calculateRate(tasks.completed, reviewedTasks),
      completionRate: calculateRate(tasks.completed, selectedTaskCount),
      revisionRate: calculateRate(tasks.revisionRequested, submittedTasks),
      disputeRate: calculateRate(tasks.disputed, selectedTaskCount),
    };

    return sendResponse('Provider dashboard summary fetched successfully.', {
      applications,
      tasks,
      performance,
      contribution,
      meta: {
        providerId,
        websiteId: website?.id ?? null,
        range: dateRange.range,
        from: dateRange.from,
        to: dateRange.to,
      },
    });
  }

  async getTaskControl(
    providerId: string,
    query: GetProviderDashboardSummaryQueryDto,
  ) {
    const dateRange = this.resolveDateRange(query);
    const website = await this.validateProviderWebsite(
      providerId,
      query.websiteId,
    );
    const taskWhere = this.buildTaskWhere(providerId, website?.id, dateRange);

    const [groupedTasks, totalTasks] = await Promise.all([
      this.prisma.placementTask.groupBy({
        by: ['lifecycleStatus'],
        where: taskWhere,
        _count: { _all: true },
      }),
      this.prisma.placementTask.count({ where: taskWhere }),
    ]);

    const taskCounts = this.toStatusCountMap(groupedTasks);
    const active =
      (taskCounts.ASSIGNED ?? 0) +
      (taskCounts.IN_PROGRESS ?? 0) +
      (taskCounts.REVISION_REQUESTED ?? 0);
    const submitted = taskCounts.SUBMITTED ?? 0;
    const review =
      (taskCounts.SUBMITTED ?? 0) + (taskCounts.REVISION_REQUESTED ?? 0);

    return sendResponse('Provider task control summary fetched successfully.', {
      all: totalTasks,
      active,
      submitted,
      review,
      breakdown: {
        assigned: taskCounts.ASSIGNED ?? 0,
        inProgress: taskCounts.IN_PROGRESS ?? 0,
        submitted,
        revisionRequested: taskCounts.REVISION_REQUESTED ?? 0,
        completed: taskCounts.COMPLETED ?? 0,
        cancelled: taskCounts.CANCELLED ?? 0,
        disputed: taskCounts.DISPUTED ?? 0,
        expired: taskCounts.EXPIRED ?? 0,
      },
      meta: {
        providerId,
        websiteId: website?.id ?? null,
        range: dateRange.range,
        from: dateRange.from,
        to: dateRange.to,
      },
    });
  }
  async getActivity(
    providerId: string,
    query: GetProviderDashboardActivityQueryDto,
  ) {
    const website = await this.validateProviderWebsite(
      providerId,
      query.websiteId,
    );
    const { from, to } = this.resolveExplicitDateRange(query.from, query.to);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.TaskFlowWhereInput = {
      OR: [
        { providerId: providerId },
        {
          actorId: providerId,
          actorRole: TaskFlowActorRole.PROVIDER,
        },
      ],
      ...(website
        ? {
            providerWebsiteId: website.id,
          }
        : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.taskFlow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          placementTaskId: true,
          eventType: true,
          actorRole: true,
          fromStatus: true,
          toStatus: true,
          actionTaken: true,
          note: true,
          metadata: true,
          requesterWebsiteId: true,
          providerWebsiteId: true,
          createdAt: true,
          placementTask: {
            select: {
              id: true,
              projectTitle: true,
              placementType: true,
              linkAttribute: true,
              lifecycleStatus: true,
              submissionStatus: true,
              requesterWebsiteId: true,
              assignedProviderWebsiteId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          actor: {
            select: { id: true, name: true, email: true },
          },
          requester: {
            select: { id: true, name: true, email: true },
          },
          provider: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.taskFlow.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return sendResponse('Provider dashboard activity fetched successfully.', {
      data: rows.map((item) => ({
        id: item.id,
        taskId: item.placementTaskId,
        eventType: item.eventType,
        actorRole: item.actorRole,
        label: this.getActivityLabel(item.eventType, item.actionTaken),
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        note: item.note,
        metadata: item.metadata,
        createdAt: item.createdAt,
        task: {
          id: item.placementTask.id,
          projectTitle: item.placementTask.projectTitle,
          placementType: item.placementTask.placementType,
          linkAttribute: item.placementTask.linkAttribute,
          lifecycleStatus: item.placementTask.lifecycleStatus,
          submissionStatus: item.placementTask.submissionStatus,
        },
        actor: item.actor,
        requester: item.requester,
        provider: item.provider,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  }

  private async validateProviderWebsite(
    providerId: string,
    websiteId?: string,
  ) {
    if (!websiteId) {
      return null;
    }

    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,
        authorId: providerId,
        isDeleted: false,
      },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Provider website not found.');
    }

    return website;
  }

  private async getProviderWebsiteIds(providerId: string, websiteId?: string) {
    const website = await this.validateProviderWebsite(providerId, websiteId);
    if (website) {
      return [website.id];
    }

    const websites = await this.prisma.website.findMany({
      where: {
        authorId: providerId,
        isDeleted: false,
      },
      select: { id: true },
    });

    return websites.map((item) => item.id);
  }

  private resolveDateRange(
    query: GetProviderDashboardSummaryQueryDto,
  ): DateRangeMeta {
    const explicit = this.resolveExplicitDateRange(query.from, query.to);
    if (explicit.from || explicit.to) {
      return {
        range: 'custom',
        from: explicit.from,
        to: explicit.to,
      };
    }

    const range = query.range ?? '30d';
    if (range === 'all') {
      return { range, from: null, to: null };
    }

    const to = new Date();
    const from = new Date(to);
    const rangeDays = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    from.setDate(from.getDate() - rangeDays);

    return {
      range,
      from,
      to,
    };
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

  private buildApplicationWhere(
    providerId: string,
    websiteId: string | undefined,
    dateRange: DateRangeMeta,
  ): Prisma.PlacementApplicationWhereInput {
    return {
      providerId,
      ...(websiteId ? { providerWebsiteId: websiteId } : {}),
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

  private buildTaskWhere(
    providerId: string,
    websiteId: string | undefined,
    dateRange: DateRangeMeta,
  ): Prisma.PlacementTaskWhereInput {
    // TODO: For richer date filtering, split workload metrics by event date
    // such as assignedAt, submittedAt, completedAt, and cancelledAt.
    return {
      selectedProviderId: providerId,
      ...(websiteId ? { assignedProviderWebsiteId: websiteId } : {}),
      ...(dateRange.from || dateRange.to
        ? {
            assignedAt: {
              ...(dateRange.from ? { gte: dateRange.from } : {}),
              ...(dateRange.to ? { lte: dateRange.to } : {}),
            },
          }
        : {}),
    };
  }

  private buildContributionWhere(
    websiteIds: string[],
    dateRange: DateRangeMeta,
  ) {
    return {
      websiteId: { in: websiteIds },
      status: 'VERIFIED' as const,
      ...(dateRange.from || dateRange.to
        ? {
            rewardedAt: {
              ...(dateRange.from ? { gte: dateRange.from } : {}),
              ...(dateRange.to ? { lte: dateRange.to } : {}),
            },
          }
        : {}),
    };
  }

  private toStatusCountMap(
    rows: Array<{
      status?: string;
      lifecycleStatus?: string;
      _count: { _all: number };
    }>,
  ) {
    return rows.reduce<Record<string, number>>((acc, row) => {
      const key = (row.status ?? row.lifecycleStatus) as string;
      acc[key] = row._count._all;
      return acc;
    }, {});
  }

  private buildContributionSummary(
    rows: Array<{
      websiteId: string;
      totalVerifiedPlacements: number;
      lastMilestoneAtCount: number;
      lastVerifiedPlacementAt: Date | null;
    }>,
    contributionRewardsCount: number,
  ) {
    const totalVerifiedPlacements = rows.reduce(
      (sum, row) => sum + row.totalVerifiedPlacements,
      0,
    );
    const lastMilestoneAtCount = rows.reduce(
      (sum, row) => sum + row.lastMilestoneAtCount,
      0,
    );
    const lastVerifiedPlacementAt =
      rows
        .map((row) => row.lastVerifiedPlacementAt)
        .filter((item): item is Date => Boolean(item))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    const nextMilestoneAt = this.getNextMilestoneAt(totalVerifiedPlacements);

    return {
      verifiedPlacements: totalVerifiedPlacements,
      lastVerifiedPlacementAt,
      lastMilestoneAtCount,
      nextMilestoneAt,
      placementsUntilNextMilestone:
        nextMilestoneAt !== null
          ? nextMilestoneAt - totalVerifiedPlacements
          : null,
      contributionRewardsCount,
    };
  }

  private getNextMilestoneAt(totalVerifiedPlacements: number) {
    if (totalVerifiedPlacements <= 0) {
      return 10;
    }

    return Math.floor(totalVerifiedPlacements / 10) * 10 + 10;
  }

  private getActivityLabel(
    eventType: TaskFlowEventType | null,
    actionTaken: string | null,
  ) {
    if (!eventType) {
      return actionTaken || 'Task activity';
    }

    const labels: Record<TaskFlowEventType, string> = {
      TASK_CREATED: 'Task created',
      TASK_PUBLISHED: 'Task published',
      REQUESTED_DEADLINE_UPDATED: 'Requested deadline updated',
      PROVIDER_APPLIED: 'You applied to a task',
      PROVIDER_SELECTED: 'You were selected for a task',
      APPLICATION_REJECTED: 'Application rejected',
      PROVIDER_PROOF_UPLOADED: 'You uploaded proof',
      WORK_STARTED: 'You started work',
      WORK_SUBMITTED: 'You submitted work',
      WORK_RESUBMITTED: 'You resubmitted work',
      CANCELLATION_REQUESTED: 'Cancellation requested',
      CANCELLATION_ACCEPTED: 'Cancellation accepted',
      CANCELLATION_REJECTED: 'Cancellation rejected',
      REVISION_REQUESTED: 'Revision requested',
      TASK_APPROVED: 'Your work was approved',
      TASK_COMPLETED: 'Task completed',
      TASK_REJECTED: 'Submission rejected',
      TASK_CANCELLED: 'Task cancelled',
      TASK_DISPUTED: 'Task disputed',
      TASK_FROZEN: 'Task frozen',
      ADMIN_STATUS_OVERRIDE: 'Admin updated task status',
      ADMIN_CREDIT_ADJUSTED: 'Admin adjusted task credits',
      ADMIN_ABUSE_PATTERN_FLAGGED: 'Admin flagged abuse pattern',
      DEADLINE_EXTENDED: 'Deadline extended',
      SYSTEM_AUTO_FAILED: 'System auto-failed task',
    };

    return labels[eventType] ?? actionTaken ?? 'Task activity';
  }
}
