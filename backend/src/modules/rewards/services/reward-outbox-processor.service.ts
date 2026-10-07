import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  Prisma,
  RewardAuditActorType,
  RewardOutboxStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  REWARD_AUDIT_ACTIONS,
  REWARD_AUDIT_SOURCES,
} from '../enums';
import {
  RewardAuditRequestContext,
  RewardAuditService,
} from './reward-audit.service';
import { RewardEngineService } from './reward-engine.service';

type RecoverStaleProcessingInput = {
  olderThanMinutes?: number;
  limit?: number;
};

type RewardOutboxAuditContext = {
  actorType?: RewardAuditActorType;
  actorId?: string | null;
  source?: string | null;
  requestContext?: RewardAuditRequestContext;
  triggeredBy?: 'ADMIN' | 'CRON' | 'SYSTEM';
};

@Injectable()
export class RewardOutboxProcessorService {
  private readonly logger = new Logger(RewardOutboxProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardEngineService: RewardEngineService,
    private readonly rewardAuditService: RewardAuditService,
  ) {}

  @Cron('*/2 * * * *')
  async processPendingCron() {
    try {
      const cronContext: RewardOutboxAuditContext = {
        actorType: RewardAuditActorType.SYSTEM,
        source: REWARD_AUDIT_SOURCES.CRON,
        triggeredBy: 'CRON',
      };
      const recovered = await this.recoverStaleProcessing(undefined, cronContext);
      const result = await this.processPending({ limit: 25 }, cronContext);
      if (
        recovered.recovered ||
        result.processed ||
        result.failed ||
        result.skipped
      ) {
        this.logger.log(
          `Reward outbox cron finished. recovered=${recovered.recovered} processed=${result.processed} failed=${result.failed} skipped=${result.skipped}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Reward outbox cron failed.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async recoverStaleProcessing(
    input?: RecoverStaleProcessingInput,
    context?: RewardOutboxAuditContext,
  ): Promise<{ recovered: number; skipped: number }> {
    const olderThanMinutes = Math.max(
      1,
      Math.min(1440, input?.olderThanMinutes ?? 30),
    );
    const limit = Math.max(1, Math.min(200, input?.limit ?? 50));
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    let rows: Array<{
      id: string;
      taskId: string;
      status: RewardOutboxStatus;
      attempts: number;
      updatedAt: Date;
    }>;

    try {
      rows = await this.prisma.rewardProcessingOutbox.findMany({
        where: {
          status: RewardOutboxStatus.PROCESSING,
          updatedAt: { lte: cutoff },
        },
        orderBy: { updatedAt: 'asc' },
        take: limit,
        select: {
          id: true,
          taskId: true,
          status: true,
          attempts: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (this.isMissingRewardOutboxSchemaError(error)) {
        this.logger.warn(
          'Skipping reward outbox stale recovery because RewardProcessingOutbox is not migrated in the current database yet.',
        );
        return { recovered: 0, skipped: 0 };
      }

      throw error;
    }

    let recovered = 0;
    let skipped = 0;

    for (const row of rows) {
      const result = await this.prisma.rewardProcessingOutbox.updateMany({
        where: {
          id: row.id,
          status: RewardOutboxStatus.PROCESSING,
          updatedAt: { lte: cutoff },
        },
        data: {
          status: RewardOutboxStatus.FAILED,
          lastError: 'Recovered stale PROCESSING reward outbox row',
        },
      });

      if (result.count === 1) {
        recovered += 1;
        await this.rewardAuditService.recordSuccess({
          action: REWARD_AUDIT_ACTIONS.REWARD_OUTBOX_STALE_RECOVERED,
          actorType: this.normalizeActorType(context),
          actorId: context?.actorId ?? null,
          rewardOutboxId: row.id,
          source: this.normalizeSource(context),
          reason: 'Recovered stale reward outbox row stuck in PROCESSING.',
          oldValue: {
            status: row.status,
            attempts: row.attempts,
            updatedAt: row.updatedAt.toISOString(),
          },
          newValue: {
            status: RewardOutboxStatus.FAILED,
            lastError: 'Recovered stale PROCESSING reward outbox row',
          },
          metadata: {
            taskId: row.taskId,
            olderThanMinutes,
            cutoff: cutoff.toISOString(),
            triggeredBy: context?.triggeredBy ?? 'SYSTEM',
          },
          requestContext: context?.requestContext,
        });
      } else {
        skipped += 1;
      }
    }

    return { recovered, skipped };
  }

  async processPending(
    input?: { limit?: number },
    context?: RewardOutboxAuditContext,
  ) {
    const limit = Math.max(1, Math.min(100, input?.limit ?? 25));

    let rows: Array<{ id: string }>;

    try {
      rows = await this.prisma.rewardProcessingOutbox.findMany({
        where: {
          OR: [
            { status: RewardOutboxStatus.PENDING },
            {
              status: RewardOutboxStatus.FAILED,
              attempts: { lt: 3 },
            },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        select: { id: true },
      });
    } catch (error) {
      if (this.isMissingRewardOutboxSchemaError(error)) {
        this.logger.warn(
          'Skipping reward outbox processing because RewardProcessingOutbox is not migrated in the current database yet.',
        );
        return { processed: 0, failed: 0, skipped: 0 };
      }

      throw error;
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        const result = await this.processOneInternal(row.id, context);
        if (result === 'processed') {
          processed += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Reward outbox processing failed for ${row.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return { processed, failed, skipped };
  }

  async processOne(
    outboxId: string,
    context?: RewardOutboxAuditContext,
  ): Promise<void> {
    await this.processOneInternal(outboxId, context);
  }

  private async processOneInternal(
    outboxId: string,
    context?: RewardOutboxAuditContext,
  ): Promise<'processed' | 'skipped'> {
    const outbox = await this.prisma.rewardProcessingOutbox.findUnique({
      where: { id: outboxId },
      select: {
        id: true,
        taskId: true,
        status: true,
        attempts: true,
      },
    });

    if (!outbox) {
      throw new Error('Reward outbox row not found.');
    }

    if (outbox.status === RewardOutboxStatus.PROCESSED) {
      return 'skipped';
    }

    if (outbox.status === RewardOutboxStatus.FAILED && outbox.attempts >= 3) {
      return 'skipped';
    }

    if (outbox.status === RewardOutboxStatus.PROCESSING) {
      return 'skipped';
    }

    const claimed = await this.prisma.rewardProcessingOutbox.updateMany({
      where: {
        id: outbox.id,
        status: {
          in: [RewardOutboxStatus.PENDING, RewardOutboxStatus.FAILED],
        },
      },
      data: {
        status: RewardOutboxStatus.PROCESSING,
        attempts: {
          increment: 1,
        },
        lastError: null,
      },
    });

    if (claimed.count !== 1) {
      return 'skipped';
    }

    const wasRetry = outbox.status === RewardOutboxStatus.FAILED;

    if (wasRetry) {
      await this.rewardAuditService.recordSuccess({
        action: REWARD_AUDIT_ACTIONS.REWARD_OUTBOX_RETRIED,
        actorType: this.normalizeActorType(context),
        actorId: context?.actorId ?? null,
        rewardOutboxId: outbox.id,
        source: this.normalizeSource(context),
        reason: 'Retrying previously failed reward outbox row.',
        oldValue: {
          status: outbox.status,
          attempts: outbox.attempts,
        },
        newValue: {
          status: RewardOutboxStatus.PROCESSING,
          attempts: outbox.attempts + 1,
        },
        metadata: {
          taskId: outbox.taskId,
          triggeredBy: context?.triggeredBy ?? 'SYSTEM',
        },
        requestContext: context?.requestContext,
      });
    }

    try {
      const result = await this.rewardEngineService.processApprovedTaskReward({
        taskId: outbox.taskId,
        source: 'OUTBOX',
      });

      const processedAt = new Date();
      await this.prisma.rewardProcessingOutbox.update({
        where: { id: outbox.id },
        data: {
          status: RewardOutboxStatus.PROCESSED,
          processedAt,
          lastError: result.status === 'SKIPPED' ? result.reason ?? null : null,
        },
      });

      await this.rewardAuditService.recordSuccess({
        action: REWARD_AUDIT_ACTIONS.REWARD_OUTBOX_PROCESSED,
        actorType: this.normalizeActorType(context),
        actorId: context?.actorId ?? null,
        rewardOutboxId: outbox.id,
        source: this.normalizeSource(context),
        reason:
          result.status === 'PROCESSED'
            ? 'Reward outbox row processed successfully.'
            : result.reason ?? 'Reward outbox row processed with no-op outcome.',
        oldValue: {
          status: wasRetry ? RewardOutboxStatus.FAILED : outbox.status,
          attempts: outbox.attempts,
        },
        newValue: {
          status: RewardOutboxStatus.PROCESSED,
          processedAt: processedAt.toISOString(),
          attempts: outbox.attempts + 1,
        },
        metadata: {
          taskId: outbox.taskId,
          resultStatus: result.status,
          resultReason: result.reason ?? null,
          triggeredBy: context?.triggeredBy ?? 'SYSTEM',
        },
        requestContext: context?.requestContext,
      });

      return result.status === 'PROCESSED' ? 'processed' : 'skipped';
    } catch (error) {
      const normalizedError = this.normalizeError(error);
      await this.prisma.rewardProcessingOutbox.update({
        where: { id: outbox.id },
        data: {
          status: RewardOutboxStatus.FAILED,
          lastError: normalizedError,
        },
      });

      await this.rewardAuditService.recordFailure({
        action: REWARD_AUDIT_ACTIONS.REWARD_OUTBOX_FAILED,
        actorType: this.normalizeActorType(context),
        actorId: context?.actorId ?? null,
        rewardOutboxId: outbox.id,
        source: this.normalizeSource(context),
        reason: 'Reward outbox processing failed.',
        errorMessage: normalizedError,
        oldValue: {
          status: RewardOutboxStatus.PROCESSING,
          attempts: outbox.attempts + 1,
        },
        newValue: {
          status: RewardOutboxStatus.FAILED,
          lastError: normalizedError,
        },
        metadata: {
          taskId: outbox.taskId,
          previousStatus: outbox.status,
          attempts: outbox.attempts + 1,
          triggeredBy: context?.triggeredBy ?? 'SYSTEM',
        },
        requestContext: context?.requestContext,
      });

      throw error;
    }
  }

  private normalizeActorType(context?: RewardOutboxAuditContext) {
    return context?.actorType === RewardAuditActorType.ADMIN
      ? RewardAuditActorType.ADMIN
      : RewardAuditActorType.SYSTEM;
  }

  private normalizeSource(context?: RewardOutboxAuditContext) {
    return context?.source ?? REWARD_AUDIT_SOURCES.OUTBOX_PROCESSOR;
  }

  private normalizeError(error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error ?? 'Unknown error');
    return message.slice(0, 1000);
  }

  private isMissingRewardOutboxSchemaError(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (!['P2021', 'P2022'].includes(error.code)) {
      return false;
    }

    const meta = (error.meta) ?? {};
    const table = String(meta.table ?? '');
    const column = String(meta.column ?? '');
    const message = error.message ?? '';

    return (
      table.includes('RewardProcessingOutbox') ||
      column.includes('RewardProcessingOutbox') ||
      message.includes('RewardProcessingOutbox')
    );
  }
}


