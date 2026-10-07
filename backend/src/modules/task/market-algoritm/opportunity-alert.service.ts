import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { TaskNotificationService } from 'src/modules/task-notification/task-notification.service';
import { TaskNotificationTrigger } from 'src/modules/task-notification/enums/task-notification-trigger.enum';
import { OpportunityAlertProducer } from './opportunity-alert.producer';
import { isOpportunityAlertAsync } from './marketplace-queue-flags';

const MAX_NOTIFICATIONS_PER_PROVIDER_PER_DAY = 5;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SCAN_WINDOW_MS = 24 * 60 * 60 * 1000; // recent open-task window
const SCAN_BATCH_SIZE = 50;
const SCAN_INTERVAL = '*/15 * * * *'; // every 15 minutes
const ALERTED_TASKS_WINDOW_MS = 24 * 60 * 60 * 1000; // de-dupe window per task

@Injectable()
export class OpportunityAlertService {
  private readonly logger = new Logger(OpportunityAlertService.name);
  private readonly dailyCounters = new Map<
    string,
    { count: number; resetAt: number }
  >();
  // Tracks taskIds already alerted per day to avoid double-alerting idle tasks
  // across repeated scheduled scans (spec §alert-de-dupe).
  private readonly alertedTaskIds = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskNotificationService: TaskNotificationService,
    private readonly configService: ConfigService,
    private readonly opportunityAlertProducer: OpportunityAlertProducer,
  ) {}

  /**
   * Hot-path entry point used when a task opens. When the async queue flag is
   * on (default) the fan-out is enqueued for the BullMQ worker; otherwise it
   * runs synchronously inline. Both paths invoke the same
   * `alertMatchingProviders` engine method, so the resulting notifications are
   * identical.
   */
  async scheduleOrRunAlertMatchingProviders(taskId: string): Promise<void> {
    if (isOpportunityAlertAsync(this.configService)) {
      await this.opportunityAlertProducer.enqueueAlertMatchingProviders({
        taskId,
      });
      return;
    }

    await this.alertMatchingProviders(taskId);
  }

  async alertMatchingProviders(taskId: string): Promise<void> {
    try {
      const task = await this.prisma.placementTask.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          requesterWebsiteId: true,
          placementType: true,
          country: true,
          language: true,
          lifecycleStatus: true,
          projectTitle: true,
          requesterId: true,
        },
      });

      if (!task) {
        this.logger.warn(`OpportunityAlert: task ${taskId} not found`);
        return;
      }

      if (
        task.lifecycleStatus !== 'OPEN' &&
        task.lifecycleStatus !== 'WAITING_FOR_APPLICANTS'
      ) {
        return;
      }

      const requesterWebsite = await this.prisma.website.findUnique({
        where: { id: task.requesterWebsiteId },
        select: {
          marketplaceCategories: {
            select: { role: true, category: { select: { slug: true } } },
          },
        },
      });

      const matchedProviders = await this.findMatchingProviders({
        primaryCategoryKey:
          requesterWebsite?.marketplaceCategories?.find(
            (c) => c.role === 'PRIMARY',
          )?.category?.slug ?? null,
        country: task.country ?? null,
        language: task.language ?? null,
        requesterWebsiteId: task.requesterWebsiteId,
      });

      this.logger.log(
        `OpportunityAlert: found ${matchedProviders.length} matching providers for task ${taskId}`,
      );

      const now = Date.now();

      for (const provider of matchedProviders) {
        if (!this.isWithinRateLimit(provider.userId, now)) {
          continue;
        }

        this.taskNotificationService
          .sendTaskNotification({
            trigger: TaskNotificationTrigger.PROVIDER_NEW_OPPORTUNITY,
            task: {
              id: task.id,
              projectTitle: task.projectTitle,
              requesterId: task.requesterId,
            },
            providerId: provider.userId,
            actorId: task.requesterId,
            idempotencyKey: `opportunity-alert-${provider.userId}-${taskId}`,
          })
          .catch(() => {
            /* fire-and-forget */
          });

        this.incrementCounter(provider.userId, now);
      }

      // Mark task as alerted for this day so the scheduled scan does not repeat it.
      this.markTaskAlerted(task.id, now);
    } catch (error) {
      this.logger.warn(
        `OpportunityAlert: failed to alert providers for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Scheduled scan: alert idle providers about recently-created/open tasks that
   * may have been missed at creation time. Runs every 15 minutes (spec §alert-scan).
   * Respects the per-provider daily rate-limit and de-dupes already-alerted
   * taskIds within the window so providers are not over-notified.
   */

  async scanOpenTasks(): Promise<void> {
    try {
      const now = Date.now();
      const since = new Date(now - SCAN_WINDOW_MS);

      const openTasks = await this.prisma.placementTask.findMany({
        where: {
          lifecycleStatus: { in: ['OPEN', 'WAITING_FOR_APPLICANTS'] },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: SCAN_BATCH_SIZE,
        select: { id: true },
      });

      for (const openTask of openTasks) {
        if (this.wasTaskAlerted(openTask.id, now)) {
          continue;
        }
        await this.alertMatchingProviders(openTask.id).catch(() => {
          /* fire-and-forget; keep scanning remaining tasks */
        });
      }
    } catch (error) {
      this.logger.warn(
        `OpportunityAlert: scanOpenTasks failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async findMatchingProviders(params: {
    primaryCategoryKey: string | null;
    country: string | null;
    language: string | null;
    requesterWebsiteId: string;
  }): Promise<Array<{ userId: string; websiteId: string }>> {
    const websites = await this.prisma.website.findMany({
      where: {
        isDeleted: false,
        verificationStatus: 'VERIFIED',
        marketplaceVisibilityStatus: 'VISIBLE',
        isFlag: false,
        isWalletLock: false,
        id: { not: params.requesterWebsiteId },
        ...(params.primaryCategoryKey
          ? {
              marketplaceCategories: {
                some: {
                  role: 'PRIMARY',
                  category: { slug: params.primaryCategoryKey },
                },
              },
            }
          : {}),
        ...(params.country ? { country: params.country } : {}),
      },
      select: {
        id: true,
        authorId: true,
        matchingProfile: {
          select: {
            marketplaceStatus: true,
            isSuppressed: true,
            suppressedUntil: true,
            riskScore: true,
          },
        },
      },
    });

    return websites
      .filter((website) => {
        if (!website.matchingProfile) return false;
        if (website.matchingProfile.marketplaceStatus === 'SUSPENDED')
          return false;
        if (website.matchingProfile.isSuppressed) {
          if (
            !website.matchingProfile.suppressedUntil ||
            website.matchingProfile.suppressedUntil > new Date()
          ) {
            return false;
          }
        }
        if (website.matchingProfile.riskScore >= 75) return false;
        return true;
      })
      .map((website) => ({
        userId: website.authorId,
        websiteId: website.id,
      }));
  }

  private isWithinRateLimit(userId: string, now: number): boolean {
    const entry = this.dailyCounters.get(userId);
    if (!entry || now > entry.resetAt) {
      return true;
    }
    return entry.count < MAX_NOTIFICATIONS_PER_PROVIDER_PER_DAY;
  }

  private incrementCounter(userId: string, now: number): void {
    const entry = this.dailyCounters.get(userId);
    if (!entry || now > entry.resetAt) {
      this.dailyCounters.set(userId, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
      });
      return;
    }
    entry.count += 1;
  }

  private markTaskAlerted(taskId: string, now: number): void {
    this.alertedTaskIds.set(taskId, now + ALERTED_TASKS_WINDOW_MS);
  }

  private wasTaskAlerted(taskId: string, now: number): boolean {
    const expiresAt = this.alertedTaskIds.get(taskId);
    if (!expiresAt) {
      return false;
    }
    if (now > expiresAt) {
      this.alertedTaskIds.delete(taskId);
      return false;
    }
    return true;
  }
}
