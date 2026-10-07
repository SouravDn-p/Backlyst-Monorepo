import { Injectable } from '@nestjs/common';
import { Prisma, RewardLedgerType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { AdminRewardLedgerQueryDto, RewardLedgerQueryDto } from '../dto';
type WriteRewardLedgerInput = {
  userId: string;
  taskId?: string | null;
  badgeId?: string | null;
  sourceWebsiteId?: string | null;
  rewardType: RewardLedgerType;
  rewardCode: string;
  rewardValue?: number | null;
  eventKey: string;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
};
@Injectable()
export class RewardLedgerService {
  constructor(private readonly prisma: PrismaService) {}
  async writeOnce(
    input: WriteRewardLedgerInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const existing = await db.rewardLedger.findUnique({
      where: { eventKey: input.eventKey },
    });
    if (existing) {
      return { created: false, entry: existing };
    }
    try {
      const entry = await db.rewardLedger.create({
        data: {
          userId: input.userId,
          taskId: input.taskId ?? null,
          badgeId: input.badgeId ?? null,
          sourceWebsiteId: input.sourceWebsiteId ?? null,
          rewardType: input.rewardType,
          rewardCode: input.rewardCode,
          rewardValue: input.rewardValue ?? null,
          eventKey: input.eventKey,
          reason: input.reason ?? null,
          metadata: input.metadata,
        },
      });
      return { created: true, entry };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await db.rewardLedger.findUnique({
          where: { eventKey: input.eventKey },
        });
        if (duplicate) {
          return { created: false, entry: duplicate };
        }
      }
      throw error;
    }
  }
  async writeBadgeEvent(
    input: WriteRewardLedgerInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.writeOnce(input, tx);
  }
  async writeRewardBenefitEvent(
    input: WriteRewardLedgerInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.writeOnce(input, tx);
  }
  async getMyLedger(userId: string, query: RewardLedgerQueryDto) {
    const rows = await this.getMyLedgerRows(userId, query);
    const total = await this.prisma.rewardLedger.count({ where: this.buildWhere({ ...query, userId }) });
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    return sendResponse('Reward ledger fetched successfully.', {
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
  async getMyLedgerRows(userId: string, query: RewardLedgerQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const where = this.buildWhere({ ...query, userId });
    const rows = await this.prisma.rewardLedger.findMany({
      where,
      include: {
        badge: {
          select: { id: true, code: true, name: true },
        },
        task: {
          select: { id: true, projectTitle: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    return rows.map((row) => this.toUserLedgerRow(row));
  }
  async getAdminLedger(query: AdminRewardLedgerQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);
    const [rows, total] = await Promise.all([
      this.prisma.rewardLedger.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          badge: {
            select: { id: true, code: true, name: true },
          },
          task: {
            select: { id: true, projectTitle: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rewardLedger.count({ where }),
    ]);
    return sendResponse('Reward ledger fetched successfully.', {
      data: rows.map((row) => ({
        id: row.id,
        user: row.user,
        badge: row.badge,
        rewardType: row.rewardCode,
        ledgerType: row.rewardType,
        description: row.reason ?? this.describeLedger(row.rewardType, row.rewardCode),
        createdAt: row.createdAt,
        metadataSummary: this.toMetadataSummary(row.metadata),
        task: row.task,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  }
  async getUserLedgerSummaryData(userId: string) {
    const aggregate = await this.prisma.rewardLedger.aggregate({
      where: { userId },
      _count: { _all: true },
      _max: { createdAt: true },
    });
    return {
      totalRows: aggregate._count._all,
      lastEventAt: aggregate._max.createdAt ?? null,
    };
  }
  private buildWhere(query: RewardLedgerQueryDto & { userId?: string }) {
    const ledgerType = query.type ?? query.rewardType;
    const search = query.search?.trim();
    return {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(ledgerType ? { rewardType: ledgerType } : {}),
      ...(query.rewardCode ? { rewardCode: query.rewardCode } : {}),
      ...(query.badgeDefinitionId ? { badgeId: query.badgeDefinitionId } : {}),
      ...((query.dateFrom || query.dateTo)
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { rewardCode: { contains: search, mode: 'insensitive' } },
              { reason: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    } satisfies Prisma.RewardLedgerWhereInput;
  }
  private toUserLedgerRow(row: {
    id: string;
    rewardType: RewardLedgerType;
    rewardCode: string;
    reason: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    badge: { id: string; code: string; name: string } | null;
    task: { id: string; projectTitle: string } | null;
  }) {
    return {
      id: row.id,
      type: row.rewardType,
      rewardType: row.rewardType,
      title: this.toTitle(row.rewardCode),
      description: row.reason ?? this.describeLedger(row.rewardType, row.rewardCode),
      badge: row.badge,
      benefit: this.toBenefitMetadata(row.metadata),
      createdAt: row.createdAt,
      metadata: this.toPublicMetadata(row.metadata),
      task: row.task,
    };
  }
  private toTitle(code: string) {
    return code
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }
  private describeLedger(type: RewardLedgerType, code: string) {
    return this.toTitle(code) + ' (' + type + ')';
  }
  private toPublicMetadata(metadata: Prisma.JsonValue) {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }
    return metadata;
  }
  private toMetadataSummary(metadata: Prisma.JsonValue) {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }
    const record = metadata as Record<string, unknown>;
    const summary: Record<string, unknown> = {};
    for (const key of Object.keys(record).slice(0, 5)) {
      summary[key] = record[key];
    }
    return summary;
  }
  private toBenefitMetadata(metadata: Prisma.JsonValue) {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }
    const record = metadata as Record<string, unknown>;
    return {
      rewardValue: record.rewardValue ?? null,
      source: record.actionSource ?? null,
    };
  }
}

