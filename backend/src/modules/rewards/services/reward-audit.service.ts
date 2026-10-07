import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  RewardAuditActorType,
  RewardAuditStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { RewardAuditQueryDto } from '../dto';
import {
  REWARD_AUDIT_MODULE,
  RewardAuditAction,
} from '../enums/reward-audit-action.constants';

export type RewardAuditRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type RewardAuditRecordInput = {
  action: RewardAuditAction | string;
  actorType: RewardAuditActorType;
  actorId?: string | null;
  targetUserId?: string | null;
  badgeDefinitionId?: string | null;
  userBadgeId?: string | null;
  rewardBenefitId?: string | null;
  rewardLedgerId?: string | null;
  rewardOutboxId?: string | null;
  source?: string | null;
  status?: RewardAuditStatus;
  reason?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  errorMessage?: string | null;
  requestContext?: RewardAuditRequestContext | null;
};

@Injectable()
export class RewardAuditService {
  private readonly logger = new Logger(RewardAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RewardAuditRecordInput) {
    try {
      return await this.prisma.rewardAuditLog.create({
        data: {
          module: REWARD_AUDIT_MODULE,
          action: input.action,
          actorType: input.actorType,
          actorId: input.actorId ?? null,
          targetUserId: input.targetUserId ?? null,
          badgeDefinitionId: input.badgeDefinitionId ?? null,
          userBadgeId: input.userBadgeId ?? null,
          rewardBenefitId: input.rewardBenefitId ?? null,
          rewardLedgerId: input.rewardLedgerId ?? null,
          rewardOutboxId: input.rewardOutboxId ?? null,
          source: input.source ?? null,
          status: input.status ?? RewardAuditStatus.SUCCESS,
          reason: this.normalizeNullableString(input.reason),
          oldValue: this.sanitizeJson(input.oldValue),
          newValue: this.sanitizeJson(input.newValue),
          metadata: this.sanitizeJson(input.metadata),
          errorMessage: this.normalizeErrorMessage(input.errorMessage),
          ipAddress: this.normalizeNullableString(input.requestContext?.ipAddress),
          userAgent: this.normalizeNullableString(input.requestContext?.userAgent),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write reward audit log for action ${input.action}.`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  async recordSuccess(
    input: Omit<RewardAuditRecordInput, 'status' | 'errorMessage'>,
  ) {
    return this.record({ ...input, status: RewardAuditStatus.SUCCESS });
  }

  async recordFailure(input: Omit<RewardAuditRecordInput, 'status'>) {
    return this.record({ ...input, status: RewardAuditStatus.FAILED });
  }

  async recordStatusChange(
    input: Omit<RewardAuditRecordInput, 'status'> & {
      oldStatus?: string | null;
      newStatus?: string | null;
      warning?: boolean;
    },
  ) {
    return this.record({
      ...input,
      status: input.warning ? RewardAuditStatus.WARNING : RewardAuditStatus.SUCCESS,
      oldValue: this.sanitizeJson({
        status: input.oldStatus ?? null,
        ...(this.toRecord(input.oldValue) ?? {}),
      }),
      newValue: this.sanitizeJson({
        status: input.newStatus ?? null,
        ...(this.toRecord(input.newValue) ?? {}),
      }),
    });
  }

  async getAdminAuditLogs(query: RewardAuditQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.rewardAuditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true } },
          targetUser: { select: { id: true, name: true } },
          badgeDefinition: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rewardAuditLog.count({ where }),
    ]);

    return sendResponse('Reward audit logs fetched successfully.', {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        module: row.module,
        actorType: row.actorType,
        actor: row.actor,
        targetUser: row.targetUser,
        badge: row.badgeDefinition,
        source: row.source,
        status: row.status,
        reason: row.reason,
        createdAt: row.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async getAdminAuditLogDetail(id: string) {
    const row = await this.prisma.rewardAuditLog.findUnique({
      where: { id },
      include: {
        actor: { select: { id: true, name: true, email: true } },
        targetUser: { select: { id: true, name: true, email: true } },
        badgeDefinition: {
          select: { id: true, code: true, name: true, category: true },
        },
        userBadge: {
          select: {
            id: true,
            status: true,
            earnedAt: true,
            activatedAt: true,
            deactivatedAt: true,
            revokedAt: true,
          },
        },
        rewardBenefit: {
          select: {
            id: true,
            rewardCode: true,
            rewardType: true,
            status: true,
            activatedAt: true,
            expiresAt: true,
            deactivatedAt: true,
          },
        },
        rewardLedger: {
          select: {
            id: true,
            rewardType: true,
            rewardCode: true,
            rewardValue: true,
            createdAt: true,
          },
        },
        rewardOutbox: {
          select: {
            id: true,
            taskId: true,
            status: true,
            attempts: true,
            processedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Reward audit log not found.');
    }

    return sendResponse('Reward audit log fetched successfully.', {
      id: row.id,
      action: row.action,
      module: row.module,
      actorType: row.actorType,
      actor: row.actor,
      targetUser: row.targetUser,
      badge: row.badgeDefinition,
      userBadge: row.userBadge,
      rewardBenefit: row.rewardBenefit,
      rewardLedger: row.rewardLedger,
      rewardOutbox: row.rewardOutbox,
      source: row.source,
      status: row.status,
      reason: row.reason,
      oldValue: row.oldValue,
      newValue: row.newValue,
      metadata: row.metadata,
      errorMessage: row.errorMessage,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    });
  }

  private buildWhere(query: RewardAuditQueryDto): Prisma.RewardAuditLogWhereInput {
    const search = query.search?.trim();

    return {
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorType ? { actorType: query.actorType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.targetUserId ? { targetUserId: query.targetUserId } : {}),
      ...(query.badgeDefinitionId
        ? { badgeDefinitionId: query.badgeDefinitionId }
        : {}),
      ...(query.rewardBenefitId ? { rewardBenefitId: query.rewardBenefitId } : {}),
      ...(query.rewardOutboxId ? { rewardOutboxId: query.rewardOutboxId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.dateFrom || query.dateTo
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
              { action: { contains: search, mode: 'insensitive' } },
              { source: { contains: search, mode: 'insensitive' } },
              { reason: { contains: search, mode: 'insensitive' } },
              { errorMessage: { contains: search, mode: 'insensitive' } },
              { actor: { name: { contains: search, mode: 'insensitive' } } },
              {
                targetUser: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
              {
                badgeDefinition: {
                  code: { contains: search, mode: 'insensitive' },
                },
              },
              {
                badgeDefinition: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }

  private sanitizeJson(value: unknown): Prisma.InputJsonValue | undefined {
    const sanitized = this.sanitizeValue(value);
    return sanitized === undefined
      ? undefined
      : (sanitized as Prisma.InputJsonValue);
  }

  private sanitizeValue(value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
        if (this.isSensitiveKey(key)) {
          continue;
        }
        const sanitized = this.sanitizeValue(raw);
        if (sanitized !== undefined) {
          result[key] = sanitized;
        }
      }
      return result;
    }

    if (typeof value === 'string') {
      return value.length > 5000 ? value.slice(0, 5000) : value;
    }

    return value;
  }

  private isSensitiveKey(key: string) {
    return /(password|token|secret|cookie|authorization|accesskey|secretkey)/i.test(
      key,
    );
  }

  private normalizeErrorMessage(value?: string | null) {
    const normalized = this.normalizeNullableString(value);
    return normalized ? normalized.slice(0, 1000) : null;
  }

  private normalizeNullableString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private toRecord(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }
}
