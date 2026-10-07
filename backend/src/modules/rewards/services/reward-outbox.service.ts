import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  RewardAuditActorType,
  RewardOutboxStatus,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  REWARD_AUDIT_ACTIONS,
  REWARD_AUDIT_SOURCES,
} from '../enums';
import { RewardOutboxQueryDto } from '../dto';
import { RewardAuditService } from './reward-audit.service';

type EnqueueApprovedTaskInput = {
  taskId: string;
  tx?: Prisma.TransactionClient;
  source?: string;
};

@Injectable()
export class RewardOutboxService {
  private readonly logger = new Logger(RewardOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardAuditService: RewardAuditService,
  ) {}

  async enqueueApprovedTask(input: EnqueueApprovedTaskInput): Promise<{
    created: boolean;
    rowId: string | null;
  }> {
    const db = input.tx ?? this.prisma;

    const existing = await db.rewardProcessingOutbox.findUnique({
      where: { taskId: input.taskId },
      select: { id: true },
    });

    if (existing) {
      if (input.source) {
        this.logger.debug(
          `Reward outbox already existed for task ${input.taskId} from ${input.source}.`,
        );
      }

      return { created: false, rowId: existing.id };
    }

    try {
      const created = await db.rewardProcessingOutbox.create({
        data: {
          taskId: input.taskId,
          status: RewardOutboxStatus.PENDING,
        },
        select: { id: true },
      });

      await this.rewardAuditService.recordSuccess({
        action: REWARD_AUDIT_ACTIONS.REWARD_OUTBOX_CREATED,
        actorType: RewardAuditActorType.SYSTEM,
        rewardOutboxId: created.id,
        source: input.source ?? REWARD_AUDIT_SOURCES.OUTBOX_SERVICE,
        reason: 'Reward outbox row created for approved task reward processing.',
        metadata: {
          taskId: input.taskId,
          status: RewardOutboxStatus.PENDING,
        },
      });

      if (input.source) {
        this.logger.debug(
          `Reward outbox created for task ${input.taskId} from ${input.source}.`,
        );
      }

      return { created: true, rowId: created.id };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await db.rewardProcessingOutbox.findUnique({
          where: { taskId: input.taskId },
          select: { id: true },
        });

        if (duplicate) {
          return { created: false, rowId: duplicate.id };
        }
      }

      throw error;
    }
  }

  async getOutboxHealth() {
    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
    const [
      pendingCount,
      processingCount,
      processedCount,
      failedCount,
      staleProcessingCount,
      oldestPending,
      oldestFailed,
      latestProcessed,
      failedRecent,
    ] = await Promise.all([
      this.prisma.rewardProcessingOutbox.count({
        where: { status: RewardOutboxStatus.PENDING },
      }),
      this.prisma.rewardProcessingOutbox.count({
        where: { status: RewardOutboxStatus.PROCESSING },
      }),
      this.prisma.rewardProcessingOutbox.count({
        where: { status: RewardOutboxStatus.PROCESSED },
      }),
      this.prisma.rewardProcessingOutbox.count({
        where: { status: RewardOutboxStatus.FAILED },
      }),
      this.prisma.rewardProcessingOutbox.count({
        where: {
          status: RewardOutboxStatus.PROCESSING,
          updatedAt: { lte: staleCutoff },
        },
      }),
      this.prisma.rewardProcessingOutbox.findFirst({
        where: { status: RewardOutboxStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.prisma.rewardProcessingOutbox.findFirst({
        where: { status: RewardOutboxStatus.FAILED },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.prisma.rewardProcessingOutbox.findFirst({
        where: { status: RewardOutboxStatus.PROCESSED },
        orderBy: { processedAt: 'desc' },
        select: { processedAt: true },
      }),
      this.prisma.rewardProcessingOutbox.findMany({
        where: { status: RewardOutboxStatus.FAILED },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          taskId: true,
          attempts: true,
          lastError: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return sendResponse('Reward outbox health fetched successfully.', {
      counts: {
        PENDING: pendingCount,
        PROCESSING: processingCount,
        PROCESSED: processedCount,
        FAILED: failedCount,
      },
      staleProcessingCount,
      oldestPendingAt: oldestPending?.createdAt ?? null,
      oldestFailedAt: oldestFailed?.createdAt ?? null,
      latestProcessedAt: latestProcessed?.processedAt ?? null,
      failedRecent,
    });
  }

  async getOutboxRows(query: RewardOutboxQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RewardProcessingOutboxWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.rewardProcessingOutbox.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.rewardProcessingOutbox.count({ where }),
    ]);

    return sendResponse('Reward outbox rows fetched successfully.', {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  }
}
