import { Injectable, Logger } from '@nestjs/common';

import {
  NotificationCategory,
  NotificationType,
  Prisma,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ManualMatchQueueService as AdminManualMatchQueueService } from 'src/modules/admin/admin-manual-match-queue/manual-match-queue.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { EnqueueManualMatchDto } from 'src/modules/admin/admin-manual-match-queue/dto/manual-match-queue.dto';

// Open task lifecycle statuses eligible for manual match injection.
const OPEN_TASK_STATUSES = ['OPEN', 'WAITING_FOR_APPLICANTS'];

/**
 * Spec §18 / §21 — admin-assisted liquidity matching.
 *
 * Daily scan for persistent LOW_POOL conditions: provider websites whose
 * `lastMatchedAt` (falling back to `createdAt`) is older than
 * `MarketplaceScoringConfig.neglectedAfterHours`. For each neglected profile
 * we surface a small set of candidate open tasks and enqueue PENDING
 * ManualMatchQueue rows for admin review (idempotent — skips existing open
 * triplets). If any rows were enqueued, a single ADMIN_LOW_LIQUIDITY_ALERT
 * notification is emitted to admins.
 */
@Injectable()
export class ManualMatchQueueService {
  private readonly logger = new Logger(ManualMatchQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly manualMatchQueueService: AdminManualMatchQueueService,
    private readonly notificationService: NotificationService,
  ) {}

  async scanForLiquidityGaps() {
    try {
      const config = await this.prisma.marketplaceScoringConfig.findFirst();
      const neglectedAfterHours = config?.neglectedAfterHours ?? 72;
      const threshold = new Date(
        Date.now() - neglectedAfterHours * 60 * 60 * 1000,
      );

      const neglectedProfiles =
        await this.prisma.websiteMatchingProfile.findMany({
          where: {
            marketplaceStatus: 'ACTIVE',
            AND: [
              {
                OR: [
                  { isSuppressed: false },
                  { suppressedUntil: { lt: new Date() } },
                ],
              },
              {
                OR: [
                  { lastMatchedAt: { lt: threshold } },
                  { lastMatchedAt: null, createdAt: { lt: threshold } },
                ],
              },
            ],
          },
          select: { websiteId: true, lastMatchedAt: true, createdAt: true },
        });

      if (neglectedProfiles.length === 0) {
        this.logger.log(
          'No neglected provider profiles — LOW_POOL scan clean.',
        );
        return;
      }

      let enqueued = 0;
      for (const profile of neglectedProfiles) {
        const candidates = await this.findCandidateTasks(profile.websiteId);
        for (const task of candidates) {
          const dto: EnqueueManualMatchDto = {
            taskId: task.id,
            providerWebsiteId: profile.websiteId,
            requesterWebsiteId: task.requesterWebsiteId,
            note: `Auto-queued by LOW_POOL scan (neglected > ${neglectedAfterHours}h).`,
          };
          try {
            await this.manualMatchQueueService.enqueue(
              'SYSTEM_LIQUIDITY_CRON',
              dto,
            );
            enqueued += 1;
          } catch (err) {
            // Duplicate open triplet or validation failure — expected, skip.
            this.logger.debug(
              `Skipped manual-match enqueue for ${task.id}/${profile.websiteId}: ${(err as Error).message}`,
            );
          }
        }
      }

      if (enqueued > 0) {
        await this.notifyAdmins(enqueued, neglectedProfiles.length);
      }

      this.logger.log(
        `LOW_POOL scan complete: ${neglectedProfiles.length} neglected profile(s), ${enqueued} queue row(s) enqueued.`,
      );
    } catch (err) {
      this.logger.error(
        `LOW_POOL scan failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Find a bounded set of open tasks from distinct requester websites that the
   * neglected provider website does not own. Returns at most 5 candidates.
   */
  private async findCandidateTasks(providerWebsiteId: string) {
    const provider = await this.prisma.website.findUnique({
      where: { id: providerWebsiteId },
      select: { authorId: true },
    });
    if (!provider) return [];

    const tasks = await this.prisma.placementTask.findMany({
      where: {
        lifecycleStatus: { in: OPEN_TASK_STATUSES as TaskStatus[] },
        requesterId: { not: provider.authorId },
      },
      select: { id: true, requesterWebsiteId: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return tasks.filter((t) => t.requesterWebsiteId);
  }

  private async notifyAdmins(enqueued: number, neglectedCount: number) {
    try {
      await this.notificationService.sendAdminNotification({
        type: NotificationType.ADMIN_LOW_LIQUIDITY_ALERT,
        category: NotificationCategory.ADMIN_RISK,
        title: 'Manual match queue — LOW_POOL detected',
        body: `${neglectedCount} provider profile(s) flagged as neglected. ${enqueued} candidate match(es) queued for admin review.`,
        data: { enqueued, neglectedCount },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send LOW_POOL admin notification: ${(err as Error).message}`,
      );
    }
  }
}
