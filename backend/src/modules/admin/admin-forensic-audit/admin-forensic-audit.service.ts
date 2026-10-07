import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  AdminForensicAuditQueryDto,
  AuditActionType,
  AuditRegistryImpact,
  AuditSeverity,
} from './dto/admin-forensic-audit-query.dto';

export interface ForensicAuditLogEntry {
  entryId: string;
  timestamp: Date;
  authority: {
    code: string;
    name: string;
    adminId: string | null;
  };
  actionType: AuditActionType;
  affectedEntity: {
    type: 'TASK' | 'WEBSITE' | 'USER' | 'SYSTEM';
    id: string;
    label: string;
  };
  registryImpact: AuditRegistryImpact;
  severity: AuditSeverity;
  traceId: string;
}

@Injectable()
export class AdminForensicAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getForensicAuditLogs(query: AdminForensicAuditQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.lte = new Date(query.dateTo);

    const hasDateFilter = Boolean(query.dateFrom || query.dateTo);

    // Fetch candidate logs from source tables in parallel
    const [creditAdjustments, overrides, taskFlows, rewardLogs] =
      await Promise.all([
        this.prisma.adminCreditAdjustment.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          include: {
            admin: { select: { id: true, name: true, role: true } },
            website: { select: { id: true, name: true, websiteUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),

        this.prisma.marketplaceOverride.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          include: {
            admin: { select: { id: true, name: true, role: true } },
            website: { select: { id: true, name: true, websiteUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),

        this.prisma.taskFlow.findMany({
          where: {
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            eventType: {
              in: [
                'TASK_CANCELLED',
                'TASK_FROZEN',
                'TASK_REJECTED',
                'TASK_DISPUTED',
                'ADMIN_CREDIT_ADJUSTED',
              ],
            },
          },
          include: {
            actor: { select: { id: true, name: true, role: true } },
            placementTask: { select: { id: true, projectTitle: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),

        this.prisma.rewardAuditLog.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          include: {
            actor: { select: { id: true, name: true, role: true } },
            targetUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      ]);

    const normalizedLogs: ForensicAuditLogEntry[] = [];

    // 1. Normalize AdminCreditAdjustments -> CREDIT_ADJUSTMENT / ESCROW_REVERSAL
    for (const adj of creditAdjustments) {
      const isReversal = adj.action === 'REVERSE';
      const actionType = isReversal
        ? AuditActionType.ESCROW_REVERSAL
        : AuditActionType.CREDIT_ADJUSTMENT;

      const codeNum = (
        Math.abs(this.hashCode(adj.id)) % 900000 +
        100000
      ).toString();

      normalizedLogs.push({
        entryId: `BK-LOG-${codeNum}`,
        timestamp: adj.createdAt,
        authority: {
          code: adj.admin ? `AD-${adj.admin.id.slice(0, 2).toUpperCase()}-BK` : 'AD-01-BK',
          name: adj.admin?.name || 'SUPER ADMIN',
          adminId: adj.adminId ?? null,
        },
        actionType,
        affectedEntity: {
          type: 'WEBSITE',
          id: adj.websiteId,
          label:
            adj.website?.websiteUrl?.replace(/^https?:\/\//, '').toUpperCase() ||
            adj.website?.name?.toUpperCase() ||
            'WEBSITE',
        },
        registryImpact: AuditRegistryImpact.CREDIT,
        severity: isReversal ? AuditSeverity.CRITICAL : AuditSeverity.INFO,
        traceId: adj.id,
      });
    }

    // 2. Normalize MarketplaceOverrides -> VISIBILITY_OVERRIDE / SYSTEM_THRESHOLD_UPDATE
    for (const ov of overrides) {
      const isThreshold = ov.type === 'SCORE_OVERRIDE';
      const actionType = isThreshold
        ? AuditActionType.SYSTEM_THRESHOLD_UPDATE
        : AuditActionType.VISIBILITY_OVERRIDE;

      const codeNum = (
        Math.abs(this.hashCode(ov.id)) % 900000 +
        100000
      ).toString();

      normalizedLogs.push({
        entryId: `BK-LOG-${codeNum}`,
        timestamp: ov.createdAt,
        authority: {
          code: ov.admin ? `AD-${ov.admin.id.slice(0, 2).toUpperCase()}-BK` : 'AD-04-BK',
          name: ov.admin?.name || 'COMPLIANCE ADMIN',
          adminId: ov.adminId ?? null,
        },
        actionType,
        affectedEntity: {
          type: isThreshold ? 'SYSTEM' : 'WEBSITE',
          id: ov.websiteId || ov.id,
          label:
            ov.website?.websiteUrl?.replace(/^https?:\/\//, '').toUpperCase() ||
            ov.website?.name?.toUpperCase() ||
            'MARKETPLACE_CONFIG',
        },
        registryImpact: isThreshold
          ? AuditRegistryImpact.SYSTEM
          : AuditRegistryImpact.VISIBILITY,
        severity: isThreshold ? AuditSeverity.CRITICAL : AuditSeverity.WARNING,
        traceId: ov.id,
      });
    }

    // 3. Normalize TaskFlow Dispute/Reversals -> ESCROW_REVERSAL
    for (const tf of taskFlows) {
      const codeNum = (
        Math.abs(this.hashCode(tf.id)) % 900000 +
        100000
      ).toString();

      const taskLabel = tf.placementTask?.projectTitle
        ? `TASK: ${tf.placementTask.projectTitle.toUpperCase().slice(0, 20)}`
        : `TASK T-${tf.placementTaskId.slice(0, 6).toUpperCase()}`;

      normalizedLogs.push({
        entryId: `BK-LOG-${codeNum}`,
        timestamp: tf.createdAt,
        authority: {
          code: tf.actor ? `AD-${tf.actor.id.slice(0, 2).toUpperCase()}-BK` : 'AD-01-BK',
          name: tf.actor?.name || 'SYSTEM AUTOMATION',
          adminId: tf.actorId ?? null,
        },
        actionType: AuditActionType.ESCROW_REVERSAL,
        affectedEntity: {
          type: 'TASK',
          id: tf.placementTaskId,
          label: taskLabel,
        },
        registryImpact: AuditRegistryImpact.CREDIT,
        severity: AuditSeverity.CRITICAL,
        traceId: tf.id,
      });
    }

    // 4. Normalize RewardAuditLogs
    for (const rw of rewardLogs) {
      const codeNum = (
        Math.abs(this.hashCode(rw.id)) % 900000 +
        100000
      ).toString();

      normalizedLogs.push({
        entryId: `BK-LOG-${codeNum}`,
        timestamp: rw.createdAt,
        authority: {
          code: rw.actor ? `AD-${rw.actor.id.slice(0, 2).toUpperCase()}-BK` : 'AD-02-BK',
          name: rw.actor?.name || 'REWARDS ADMIN',
          adminId: rw.actorId ?? null,
        },
        actionType: AuditActionType.CREDIT_ADJUSTMENT,
        affectedEntity: {
          type: 'USER',
          id: rw.targetUserId || rw.id,
          label:
            rw.targetUser?.name?.toUpperCase() ||
            rw.targetUser?.email?.toUpperCase() ||
            'USER ACCOUNT',
        },
        registryImpact: AuditRegistryImpact.CREDIT,
        severity:
          rw.status === 'FAILED' ? AuditSeverity.WARNING : AuditSeverity.INFO,
        traceId: rw.id,
      });
    }

    // Merge and sort chronologically DESC
    normalizedLogs.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    // Apply Filters
    let filteredLogs = normalizedLogs;

    if (query.actionType && query.actionType !== AuditActionType.ALL) {
      filteredLogs = filteredLogs.filter(
        (log) => log.actionType === query.actionType,
      );
    }

    if (
      query.registryImpact &&
      query.registryImpact !== AuditRegistryImpact.ALL
    ) {
      filteredLogs = filteredLogs.filter(
        (log) => log.registryImpact === query.registryImpact,
      );
    }

    if (query.severity && query.severity !== AuditSeverity.ALL) {
      filteredLogs = filteredLogs.filter(
        (log) => log.severity === query.severity,
      );
    }

    if (query.search) {
      const s = query.search.toLowerCase();
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.entryId.toLowerCase().includes(s) ||
          log.authority.name.toLowerCase().includes(s) ||
          log.authority.code.toLowerCase().includes(s) ||
          log.affectedEntity.label.toLowerCase().includes(s) ||
          log.actionType.toLowerCase().includes(s),
      );
    }

    // Standard pagination slicing
    const total = filteredLogs.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filteredLogs.slice(startIndex, startIndex + limit);

    return sendResponse('Forensic audit ledger retrieved successfully.', {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return hash;
  }
}
