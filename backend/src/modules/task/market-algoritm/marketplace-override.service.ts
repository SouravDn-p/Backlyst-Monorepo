import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

export type MarketplaceOverrideTypeValue =
  | 'BOOST'
  | 'SUPPRESS'
  | 'FORCE_MATCH'
  | 'SCORE_OVERRIDE'
  | 'PENALTY'
  | 'LIMIT_BYPASS'
  | 'RISK_BYPASS'
  | 'PRIORITY'
  | 'MANUAL_ASSIGNMENT'
  | 'RESTRICTION';

export interface ResolvedOverrides {
  boostValue?: number | null;
  visibilityScore?: number | null;
  opportunityScore?: number | null;
  reputationScore?: number | null;
  forceMatchNext: boolean;
  suppressed: boolean;
}

/**
 * Activates the previously-dead `MarketplaceOverride` model (spec §27).
 *
 * Admins create override rows (BOOST / SUPPRESS / FORCE_MATCH / SCORE_OVERRIDE /
 * PENALTY). The engines resolve the *active* overrides for a website at runtime
 * and apply them. Eligibility / ownership / security gates are never overridden
 * by these rows — only ranking weights, suppression, and force-match signalling.
 */
@Injectable()
export class MarketplaceOverrideService {
  constructor(private readonly prisma: PrismaService) {}

  async createOverride(adminId: string, dto: CreateMarketplaceOverrideDto) {
    if (dto.websiteId) {
      const website = await this.prisma.website.findUnique({
        where: { id: dto.websiteId },
        select: { id: true },
      });
      if (!website) throw new NotFoundException('Website not found.');
    }

    const now = new Date();
    const override = await this.prisma.$transaction(async (tx) => {
      const created = await tx.marketplaceOverride.create({
        data: {
          websiteId: dto.websiteId,
          taskId: dto.taskId,
          accountId: dto.accountId,
          adminId,
          type: dto.type,
          status: 'ACTIVE',
          boostValue: dto.boostValue ?? null,
          visibilityScore: dto.visibilityScore ?? null,
          opportunityScore: dto.opportunityScore ?? null,
          reputationScore: dto.reputationScore ?? null,
          forceMatchNext:
            dto.type === 'FORCE_MATCH' ? (dto.forceMatchNext ?? true) : null,
          suppressUntil:
            dto.type === 'SUPPRESS'
              ? (dto.suppressUntil ?? new Date(now.getTime() + 7 * 86_400_000))
              : null,
          reasonCode: dto.reasonCode,
          note: dto.note ?? null,
          activeFrom: now,
          activeUntil: dto.activeUntil ?? null,
        },
      });

      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'OVERRIDE_CREATED',
          targetType: dto.taskId
            ? 'TASK'
            : dto.accountId
              ? 'ACCOUNT'
              : dto.websiteId
                ? 'WEBSITE'
                : 'OVERRIDE',
          targetId: dto.taskId || dto.accountId || dto.websiteId,
          overrideId: created.id,
          reasonCode: dto.reasonCode,
          explanation: dto.note,
          newValue: {
            type: dto.type,
            boostValue: dto.boostValue,
            visibilityScore: dto.visibilityScore,
            opportunityScore: dto.opportunityScore,
            reputationScore: dto.reputationScore,
            forceMatchNext: dto.forceMatchNext,
          },
          effectiveAt: now,
          expiresAt: dto.activeUntil || dto.suppressUntil || null,
        },
      });

      return created;
    });

    return sendResponse('Marketplace override created successfully.', override);
  }

  async updateOverride(adminId: string, overrideId: string, dto: any) {
    const override = await this.prisma.marketplaceOverride.findUnique({
      where: { id: overrideId },
    });
    if (!override) throw new NotFoundException('Override not found.');
    if (override.status !== 'ACTIVE') {
      throw new NotFoundException('Only active overrides can be updated.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.marketplaceOverride.update({
        where: { id: overrideId },
        data: {
          boostValue: dto.boostValue !== undefined ? dto.boostValue : undefined,
          visibilityScore: dto.visibilityScore !== undefined ? dto.visibilityScore : undefined,
          opportunityScore: dto.opportunityScore !== undefined ? dto.opportunityScore : undefined,
          reputationScore: dto.reputationScore !== undefined ? dto.reputationScore : undefined,
          forceMatchNext: dto.forceMatchNext !== undefined ? dto.forceMatchNext : undefined,
          suppressUntil: dto.suppressUntil !== undefined ? dto.suppressUntil : undefined,
          activeUntil: dto.activeUntil !== undefined ? dto.activeUntil : undefined,
          note: dto.note !== undefined ? dto.note : undefined,
        },
      });

      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'OVERRIDE_UPDATED',
          targetType: result.taskId ? 'TASK' : result.accountId ? 'ACCOUNT' : result.websiteId ? 'WEBSITE' : 'OVERRIDE',
          targetId: result.taskId || result.accountId || result.websiteId || result.id,
          overrideId: result.id,
          reasonCode: dto.reasonCode || override.reasonCode,
          explanation: dto.note || 'Override patched',
          effectiveAt: new Date(),
          newValue: { updatedFields: Object.keys(dto) },
        },
      });

      return result;
    });

    return sendResponse('Marketplace override updated successfully.', updated);
  }

  async revokeOverride(adminId: string, overrideId: string, reason: string) {
    const override = await this.prisma.marketplaceOverride.findUnique({
      where: { id: overrideId },
    });
    if (!override) throw new NotFoundException('Override not found.');
    if (override.status !== 'ACTIVE') {
      throw new NotFoundException('Override is not active.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.marketplaceOverride.update({
        where: { id: overrideId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedById: adminId,
          revokeReason: reason,
        },
      });

      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'OVERRIDE_REVOKED',
          targetType: revoked.taskId
            ? 'TASK'
            : revoked.accountId
              ? 'ACCOUNT'
              : revoked.websiteId
                ? 'WEBSITE'
                : 'OVERRIDE',
          targetId:
            revoked.taskId ||
            revoked.accountId ||
            revoked.websiteId ||
            revoked.id,
          overrideId: revoked.id,
          reasonCode: reason,
          revokedAt: new Date(),
        },
      });

      return revoked;
    });

    return sendResponse('Marketplace override revoked successfully.', updated);
  }

  async expireOverrides() {
    const now = new Date();
    const expiredOverrides = await this.prisma.marketplaceOverride.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ activeUntil: { lt: now } }, { suppressUntil: { lt: now } }],
      },
    });

    if (expiredOverrides.length === 0) return;

    let expiredCount = 0;
    for (const override of expiredOverrides) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const expired = await tx.marketplaceOverride.update({
            where: { id: override.id },
            data: {
              status: 'EXPIRED',
            },
          });

          await tx.adminActionLog.create({
            data: {
              adminId: 'SYSTEM',
              action: 'OVERRIDE_EXPIRED',
              targetType: expired.taskId
                ? 'TASK'
                : expired.accountId
                  ? 'ACCOUNT'
                  : expired.websiteId
                    ? 'WEBSITE'
                    : 'OVERRIDE',
              targetId:
                expired.taskId ||
                expired.accountId ||
                expired.websiteId ||
                expired.id,
              overrideId: expired.id,
              previousValue: { status: 'ACTIVE' },
              newValue: { status: 'EXPIRED' },
              reasonCode: 'SYSTEM_EXPIRY',
              explanation: 'Automatically expired by maintenance worker',
              effectiveAt: now,
            },
          });
        });
        expiredCount++;
      } catch (err) {
        // Skip individual failures
      }
    }

    return { expiredCount };
  }

  async listOverrides(websiteId?: string) {
    const overrides = await this.prisma.marketplaceOverride.findMany({
      where: websiteId ? { websiteId } : {},
      orderBy: { createdAt: 'desc' },
    });
    return sendResponse(
      'Marketplace overrides retrieved successfully.',
      overrides,
    );
  }

  /**
   * Resolve the effective override values for a website by reading its currently
   * ACTIVE overrides whose time window covers `now`. SCORE_OVERRIDE rows supply
   * absolute score values; BOOST raises the boost factor; FORCE_MATCH flags the
   * next match; SUPPRESS (or PENALTY) can suppress/penalise. The first non-null
   * value of each kind wins (most recent override).
   */
  async resolveForWebsite(websiteId: string): Promise<ResolvedOverrides> {
    const now = new Date();
    const overrides = await this.prisma.marketplaceOverride.findMany({
      where: {
        websiteId,
        status: 'ACTIVE',
        activeFrom: { lte: now },
        OR: [{ activeUntil: null }, { activeUntil: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    const resolved: ResolvedOverrides = {
      boostValue: null,
      visibilityScore: null,
      opportunityScore: null,
      reputationScore: null,
      forceMatchNext: false,
      suppressed: false,
    };

    for (const o of overrides) {
      if (o.type === 'SCORE_OVERRIDE' || o.type === 'BOOST') {
        if (o.boostValue != null && resolved.boostValue == null)
          resolved.boostValue = o.boostValue;
        if (o.visibilityScore != null && resolved.visibilityScore == null)
          resolved.visibilityScore = o.visibilityScore;
        if (o.opportunityScore != null && resolved.opportunityScore == null)
          resolved.opportunityScore = o.opportunityScore;
        if (o.reputationScore != null && resolved.reputationScore == null)
          resolved.reputationScore = o.reputationScore;
      }
      if (o.type === 'FORCE_MATCH' && o.forceMatchNext) {
        resolved.forceMatchNext = true;
      }
      if (o.type === 'SUPPRESS' || o.type === 'PENALTY') {
        if (o.suppressUntil && o.suppressUntil > now)
          resolved.suppressed = true;
      }
    }

    return resolved;
  }
}

export class CreateMarketplaceOverrideDto {
  @IsOptional()
  @IsString()
  websiteId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsIn([
    'BOOST',
    'SUPPRESS',
    'FORCE_MATCH',
    'SCORE_OVERRIDE',
    'PENALTY',
    'LIMIT_BYPASS',
    'RISK_BYPASS',
    'PRIORITY',
    'MANUAL_ASSIGNMENT',
    'RESTRICTION',
  ])
  type!: MarketplaceOverrideTypeValue;

  @IsOptional()
  @IsNumber()
  boostValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  visibilityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  opportunityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  reputationScore?: number;

  @IsOptional()
  @IsBoolean()
  forceMatchNext?: boolean;

  @IsOptional()
  @IsDate()
  suppressUntil?: Date;

  @IsString()
  @IsNotEmpty()
  reasonCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsDate()
  activeUntil?: Date;
}
