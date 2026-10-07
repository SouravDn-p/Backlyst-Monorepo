import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, PrismaClient } from '@prisma/client';

type TxClient = PrismaClient | Prisma.TransactionClient;
import {
  MarketplaceValidationContext,
  ValidationDecision,
  ValidationResult,
  getSafeMessage,
} from './validation-result';
import { TierEngine } from './tier-engine.service';
import { DistributionEngine } from './distribution-engine.service';
import { buildDefaultMatchingProfileCreate } from './matching-profile.defaults';
import { MarketplaceConfigService } from './marketplace-config.service';
import { RootDomainNormalizerService } from './root-domain-normalizer.service';
import {
  normalizeRootDomain as sharedNormalizeRootDomain,
  buildPairKey as sharedBuildPairKey,
  buildOrderedPairKey as sharedBuildOrderedPairKey,
} from './root-domain-normalizer.util';
import { RiskEngine } from './risk.engine';
import { MarketplaceOverrideService } from './marketplace-override.service';
import { PatternMonitorService } from './pattern-monitor.service';

export type EligibleProviderWebsite = {
  id: string;
  rootDomain: string;
};

@Injectable()
export class ValidationEngine {
  private readonly fallbackRepeatPairCooldownDays = 90;
  private readonly fallbackReciprocalCooldownDays = 120;
  private readonly fallbackMaxNetworkConcentrationPerWindow = 50;
  private readonly fallbackNetworkConcentrationWindowDays = 7;
  private readonly fallbackLowPriorityFactor = 0.7;

  private isBrowsableStatus(status: string | undefined | null): boolean {
    return status !== 'SUSPENDED';
  }

  private isSelectableStatus(status: string | undefined | null): boolean {
    return (
      status === 'ACTIVE' ||
      status === 'LOW_PRIORITY' ||
      status === 'LIMITED_ACCESS' ||
      status === 'UNDER_REVIEW' ||
      status === 'RESTRICTED'
    );
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly tierEngine: TierEngine,
    private readonly distributionEngine: DistributionEngine,
    private readonly configService: MarketplaceConfigService,
    private readonly rootDomainNormalizer: RootDomainNormalizerService,
    private readonly riskEngine: RiskEngine,
    private readonly overrideService: MarketplaceOverrideService,
    private readonly patternMonitorService: PatternMonitorService,
  ) {}

  normalizeRootDomain(value: string): string {
    return this.rootDomainNormalizer
      ? this.rootDomainNormalizer.normalizeRootDomainSync(value)
      : sharedNormalizeRootDomain(value);
  }

  buildPairKey(domainA: string, domainB: string): string {
    return sharedBuildPairKey(domainA, domainB);
  }

  buildOrderedPairKey(sourceDomain: string, targetDomain: string): string {
    return sharedBuildOrderedPairKey(sourceDomain, targetDomain);
  }

  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000; // 86_400_000

  getCooldownUntil(days: number, from = new Date()): Date {
    return new Date(from.getTime() + days * ValidationEngine.MS_PER_DAY);
  }

  async isUserActive(userId: string, tx?: TxClient): Promise<boolean> {
    const client = tx ?? this.prisma;
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    return user?.status === 'ACTIVE';
  }

  async isMarketplaceWebsiteEligible(websiteId: string, tx?: TxClient): Promise<boolean> {
    const client = tx ?? this.prisma;
    const website = await client.website.findUnique({
      where: { id: websiteId, isDeleted: false },
      include: { matchingProfile: true },
    });
    return this.isWebsiteRowMarketplaceEligible(website);
  }

  async isWebsiteEligible(websiteId: string, userId: string, tx?: TxClient): Promise<boolean> {
    const client = tx ?? this.prisma;
    const website = await client.website.findUnique({
      where: { id: websiteId },
      select: { authorId: true },
    });
    if (!website || website.authorId !== userId) {
      return false;
    }
    return this.isMarketplaceWebsiteEligible(websiteId, tx);
  }

  async getEligibleMarketplaceWebsiteIds(): Promise<string[]> {
    const websites = await this.prisma.website.findMany({
      where: {
        isDeleted: false,
        verificationStatus: 'VERIFIED',
        marketplaceVisibilityStatus: 'VISIBLE',
        isFlag: false,
        isWalletLock: false,
        matchingProfile: {
          is: {
            marketplaceStatus: { not: 'SUSPENDED' },
          },
        },
      },
      include: { matchingProfile: true },
    });
    const eligibleFlags = await Promise.all(websites.map(website => this.isWebsiteRowMarketplaceEligible(website)));
    return websites
      .filter((_, i) => eligibleFlags[i])
      .map((website) => website.id);
  }

  async getEligibleProviderWebsites(
    userId: string,
  ): Promise<EligibleProviderWebsite[]> {
    const websites = await this.prisma.website.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
        verificationStatus: 'VERIFIED',
        marketplaceVisibilityStatus: 'VISIBLE',
        isFlag: false,
        isWalletLock: false,
        matchingProfile: {
          is: {
            marketplaceStatus: { not: 'SUSPENDED' },
          },
        },
      },
      include: { matchingProfile: true },
    });
    const eligibleFlags = await Promise.all(websites.map(website => this.isWebsiteRowMarketplaceEligible(website)));
    return websites
      .filter((_, i) => eligibleFlags[i])
      .map((website) => ({
        id: website.id,
        rootDomain: this.normalizeRootDomain(
          website.rootDomain || website.websiteUrl,
        ),
      }))
      .filter((website) => website.rootDomain.length > 0);
  }

  async getCooldownBlockedPairKeys(
    providerDomains: string[],
    requesterDomains: string[],
  ): Promise<Set<string>> {
    const pairKeys = [
      ...new Set(
        providerDomains.flatMap((providerDomain) =>
          requesterDomains.map((requesterDomain) =>
            this.buildPairKey(providerDomain, requesterDomain),
          ),
        ),
      ),
    ].filter((pairKey) => pairKey.trim().length > 1);

    if (pairKeys.length === 0) {
      return new Set();
    }

    const now = new Date();
    const pairStats = await this.prisma.domainPairStat.findMany({
      where: { normalizedPairKey: { in: pairKeys } },
      select: {
        normalizedPairKey: true,
        lastSourceDomain: true,
        lastTargetDomain: true,
        repeatPairCooldownUntil: true,
        reciprocalCooldownUntil: true,
      },
    });

    const blocked = new Set<string>();
    for (const stat of pairStats) {
      const a = stat.lastSourceDomain;
      const b = stat.lastTargetDomain;
      const repeatActive =
        stat.repeatPairCooldownUntil && stat.repeatPairCooldownUntil > now;
      const reciprocalActive =
        stat.reciprocalCooldownUntil && stat.reciprocalCooldownUntil > now;

      for (const providerDomain of providerDomains) {
        for (const requesterDomain of requesterDomains) {
          if (providerDomain === requesterDomain) continue;
          const orderedKey = this.buildOrderedPairKey(
            providerDomain,
            requesterDomain,
          );
          const sameDirectionAsLast =
            a === providerDomain && b === requesterDomain;

          if (sameDirectionAsLast ? repeatActive : reciprocalActive) {
            blocked.add(orderedKey);
          }
        }
      }
    }
    return blocked;
  }

  async canAnyProviderWebsiteMatchRequester(
    providerWebsites: EligibleProviderWebsite[],
    requesterDomain: string,
  ): Promise<boolean> {
    const normalizedRequesterDomain = this.normalizeRootDomain(requesterDomain);
    if (!normalizedRequesterDomain) {
      return false;
    }
    const providerDomains = [
      ...new Set(providerWebsites.map((website) => website.rootDomain)),
    ];
    const blockedPairKeys = await this.getCooldownBlockedPairKeys(
      providerDomains,
      [normalizedRequesterDomain],
    );
    return providerDomains.some((providerDomain) => {
      if (!providerDomain || providerDomain === normalizedRequesterDomain) {
        return false;
      }
      return !blockedPairKeys.has(
        this.buildOrderedPairKey(providerDomain, normalizedRequesterDomain),
      );
    });
  }

  async canMatch(sourceDomain: string, targetDomain: string): Promise<boolean> {
    const normalizedSource = this.normalizeRootDomain(sourceDomain);
    const normalizedTarget = this.normalizeRootDomain(targetDomain);
    if (!normalizedSource || !normalizedTarget) {
      return false;
    }
    if (normalizedSource === normalizedTarget) {
      return false;
    }
    const normalizedPairKey = this.buildPairKey(
      normalizedSource,
      normalizedTarget,
    );
    const pairStat = await this.prisma.domainPairStat.findUnique({
      where: { normalizedPairKey },
    });
    if (!pairStat) return true;
    return this.isDirectionAllowed(
      pairStat,
      normalizedSource,
      normalizedTarget,
      pairStat.repeatPairCooldownUntil,
      pairStat.reciprocalCooldownUntil,
    );
  }

  private async ensureProfile(website: any): Promise<boolean> {
    if (website?.matchingProfile) return true;
    if (!website?.id || !website?.authorId) return false;
    await this.prisma.websiteMatchingProfile.upsert({
      where: { websiteId: website.id },
      create: buildDefaultMatchingProfileCreate({
        websiteId: website.id,
        userId: website.authorId,
      }),
      update: {},
    });
    return true;
  }

  private async isWebsiteRowMarketplaceEligible(
    website: any,
  ): Promise<boolean> {
    if (!website) return false;
    if (website.verificationStatus !== 'VERIFIED') return false;
    if (website.marketplaceVisibilityStatus !== 'VISIBLE') return false;
    if (website.isFlag) return false;
    if (website.isWalletLock) return false;
    if (!website.matchingProfile) {
      const created = await this.ensureProfile(website);
      if (!created) return false;
      const fresh = await this.prisma.website.findUnique({
        where: { id: website.id },
        include: { matchingProfile: true },
      });
      website = fresh ?? website;
    }
    const mp = website.matchingProfile;
    if (!mp) return false;
    if (!this.isBrowsableStatus(mp.marketplaceStatus)) return false;

    // Evaluate effective risk (composite of ledger + real-time metrics)
    const effectiveRisk = this.riskEngine.calculateEffectiveRisk(mp);
    if (effectiveRisk >= 75) return false;

    if (mp.isSuppressed) {
      if (!mp.suppressedUntil || mp.suppressedUntil > new Date()) {
        return false;
      }
    }
    return true;
  }

  async getCooldownDays(): Promise<{ repeat: number; reciprocal: number }> {
    const cfg = await this.configService.getMergedConfig();
    return {
      repeat: cfg.repeatPairCooldownDays,
      reciprocal: cfg.reciprocalCooldownDays,
    };
  }

  async getNetworkConcentrationConfig(): Promise<{
    maxPerWindow: number;
    windowDays: number;
  }> {
    const cfg = await this.configService.getMergedConfig();
    return {
      maxPerWindow: cfg.maxNetworkConcentrationPerWindow,
      windowDays: cfg.networkConcentrationWindowDays,
    };
  }

  /**
   * Audit R-Repeat-2: active marketplace mode (EARLY_STAGE / SCALING) for audit
   * correlation. Cached merged config keeps this cheap.
   */
  private async getActiveMarketplaceMode(): Promise<string> {
    try {
      const cfg = await this.configService.getMergedConfig();
      return cfg?.mode ?? 'EARLY_STAGE';
    } catch {
      return 'EARLY_STAGE';
    }
  }

  /**
   * Audit R-Repeat-1: which direction is blocked for a provider->requester
   * candidate. Returns 'REPEAT' (same-direction repeat cooldown active) or
   * 'RECIPROCAL' (reverse-direction reciprocal cooldown active); null when not
   * cooldown-blocked. Zero windows = overridden/disabled (no block).
   */
  private async getBlockedDirection(
    sourceDomain: string,
    targetDomain: string,
    repeatDays: number,
    reciprocalDays: number,
    tx?: TxClient,
  ): Promise<'REPEAT' | 'RECIPROCAL' | null> {
    const client = tx ?? this.prisma;
    const normalizedSource = this.normalizeRootDomain(sourceDomain);
    const normalizedTarget = this.normalizeRootDomain(targetDomain);
    if (
      !normalizedSource ||
      !normalizedTarget ||
      normalizedSource === normalizedTarget
    ) {
      return null;
    }
    const pairKey = this.buildPairKey(normalizedSource, normalizedTarget);
    const pairStat = await client.domainPairStat.findUnique({
      where: { normalizedPairKey: pairKey },
    });
    if (!pairStat) return null;
    const now = new Date();
    const sameDirectionAsLast =
      pairStat.lastSourceDomain === normalizedSource &&
      pairStat.lastTargetDomain === normalizedTarget;
    if (sameDirectionAsLast) {
      if (
        repeatDays > 0 &&
        pairStat.repeatPairCooldownUntil &&
        pairStat.repeatPairCooldownUntil > now
      ) {
        return 'REPEAT';
      }
      return null;
    }
    if (
      reciprocalDays > 0 &&
      pairStat.reciprocalCooldownUntil &&
      pairStat.reciprocalCooldownUntil > now
    ) {
      return 'RECIPROCAL';
    }
    return null;
  }

  async validateTransition(
    input: {
      stage: MarketplaceValidationContext;
      actorUserId: string;
      providerWebsiteId?: string;
      requesterWebsiteId?: string;
      taskId?: string;
      providerDomain?: string;
      requesterDomain?: string;
      task?: {
        lifecycleStatus?: string;
        requesterId?: string;
        selectedProviderId?: string | null;
      };
      dailyMatches?: number;
      maxProviderMatchesPerDay?: number;
      adminOverride?: {
        adminId: string;
        rule: string;
        reasonCode: string;
        affectedDomains?: string[];
        expiresAt?: Date | string | null;
        scope?: string;
        restore?: boolean;
      };
    },
    tx?: TxClient,
  ): Promise<ValidationResult> {
    const client = tx ?? this.prisma;
    const failedRules: string[] = [];
    const restrictions: string[] = [];
    let overrideApplied = false;

    // Audit R-Repeat-1/3: declare `result` up front (with mutable blockedReason /
    // cooldownCheckMs) so the Level 2 governance checks can populate these
    // internal-only signals before the DECISION block assigns the outcome.
    const result: ValidationResult = {
      decision: 'APPROVED',
      stage: input.stage,
      failedRules,
      restrictions,
      overrideApplied,
      publicMessage: '',
      blockedReason: null,
    };

    let providerOverrides: import('./marketplace-override.service').ResolvedOverrides | null = null;
    if (input.providerWebsiteId && this.overrideService) {
      providerOverrides = await this.overrideService.resolveForWebsite(input.providerWebsiteId);
      if (providerOverrides.forceMatchNext) {
        overrideApplied = true;
      }
    }

    const skip = (rule: string) => {
      if (input.adminOverride?.rule === rule) return true;
      if (providerOverrides?.forceMatchNext) return true;
      return false;
    };

    const user = await client.user.findUnique({
      where: { id: input.actorUserId },
      select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE') failedRules.push('USER_INACTIVE');

    if (providerOverrides?.suppressed && !skip('FORCE_MATCH')) {
      failedRules.push('PROVIDER_WEBSITE_INELIGIBLE');
    }

    const stagesRequiringEligibility: MarketplaceValidationContext[] = ['GENERATE', 'APPLY', 'ACCEPT', 'ASSIGN', 'PROVIDER_APPLICATION'];
    const requiresEligibility = stagesRequiringEligibility.includes(input.stage);

    if (input.providerWebsiteId && requiresEligibility) {
      const eligible = await this.isWebsiteEligible(
        input.providerWebsiteId,
        input.actorUserId,
        client,
      );
      if (!eligible && !skip('FORCE_MATCH')) failedRules.push('PROVIDER_WEBSITE_INELIGIBLE');
    }
    if (input.requesterWebsiteId && requiresEligibility) {
      const reqEligible = await this.isMarketplaceWebsiteEligible(
        input.requesterWebsiteId,
        client,
      );
      if (!reqEligible && !skip('FORCE_MATCH')) failedRules.push('REQUESTER_WEBSITE_INELIGIBLE');
    }
    if (input.task) {
      if (
        input.task.lifecycleStatus &&
        ![
          'OPEN',
          'WAITING_FOR_APPLICANTS',
          'ASSIGNED',
          'IN_PROGRESS',
          'SUBMITTED',
        ].includes(input.task.lifecycleStatus)
      ) {
        failedRules.push('TASK_NOT_AVAILABLE');
      }
      if (
        input.task.requesterId &&
        input.actorUserId === input.task.requesterId &&
        input.stage !== 'ADMIN_FORCE' &&
        requiresEligibility
      ) {
        failedRules.push('OWN_TASK');
      }
    }

    // ---- LEVEL 2: GOVERNANCE (cooldowns; overridable) ----
    // Audit R-Repeat-3: isolate the cooldown-check duration for observability.
    const cooldownCheckStart = Date.now();
    if (requiresEligibility && input.providerDomain && input.requesterDomain) {
      if (!skip('SAME_DAY_CLUSTERING')) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const sameDayInteractions = await client.domainInteraction.count({
          where: {
            OR: [
              { sourceDomain: input.providerDomain, targetDomain: input.requesterDomain },
              { sourceDomain: input.requesterDomain, targetDomain: input.providerDomain },
            ],
            completedAt: { gte: today },
          },
        });
        if (sameDayInteractions >= 1) {
          failedRules.push('SAME_DAY_CLUSTERING');
        }
      }

      const { repeat, reciprocal } = await this.getCooldownDays();
      // Audit R-Repeat-1: determine blocked direction (REPEAT vs RECIPROCAL).
      const blockedDir = await this.getBlockedDirection(
        input.providerDomain,
        input.requesterDomain,
        skip('REPEAT_PAIR') ? 0 : repeat,
        skip('RECIPROCAL_COOLDOWN') ? 0 : reciprocal,
        tx,
      );
      if (blockedDir) {
        if (skip('REPEAT_PAIR') || skip('RECIPROCAL_COOLDOWN')) {
          overrideApplied = true;
        } else {
          failedRules.push('DOMAIN_COOLDOWN');
          // Non-user-facing governance signal (R-Repeat-1).
          result.blockedReason = blockedDir;
        }
      }
    }
    result.cooldownCheckMs = Date.now() - cooldownCheckStart;

    // ---- LEVEL 2a: GOVERNANCE (Pattern Monitoring flags) ----
    if (requiresEligibility && (input.providerWebsiteId || input.requesterWebsiteId)) {
      const websiteIds = [
        input.providerWebsiteId,
        input.requesterWebsiteId,
      ].filter(Boolean) as string[];
      if (websiteIds.length > 0) {
        const websites = await client.website.findMany({
          where: { id: { in: websiteIds } },
          select: { id: true, rootDomain: true },
        });
        const domains = websites
          .map((w) => w.rootDomain)
          .filter(Boolean) as string[];
        if (domains.length > 0) {
          const hasHighSeverityFlag = await client.patternFlag.findFirst({
            where: {
              status: 'OPEN',
              severity: 'HIGH',
              memberDomains: { hasSome: domains },
            },
          });
          if (hasHighSeverityFlag) {
            if (skip('PATTERN_RESTRICTION')) {
              overrideApplied = true;
            } else {
              failedRules.push('PATTERN_RESTRICTION');
            }
          }
        }
      }
    }

    // ---- LEVEL 2b: GOVERNANCE (network concentration; overridable) ----
    if (requiresEligibility && (input.providerDomain || input.requesterDomain)) {
      const { maxPerWindow, windowDays } =
        await this.getNetworkConcentrationConfig();
      const concentrationDomains = [input.providerDomain, input.requesterDomain]
        .filter(Boolean)
        .map((d) => this.normalizeRootDomain(d as string))
        .filter(Boolean);

      let overCap = false;
      for (const domain of concentrationDomains) {
        const allowed =
          await this.distributionEngine.isNetworkConcentrationAllowed(
            domain,
            maxPerWindow,
            windowDays,
            tx,
          );
        if (!allowed) {
          overCap = true;
          break;
        }
      }
      if (overCap) {
        if (skip('NETWORK_CONCENTRATION')) {
          overrideApplied = true;
        } else {
          failedRules.push('NETWORK_CONCENTRATION');
        }
      }
    }

    // ---- LEVEL 3: CAPACITY ----
    if (
      requiresEligibility &&
      typeof input.dailyMatches === 'number' &&
      typeof input.maxProviderMatchesPerDay === 'number'
    ) {
      if (
        !skip('DAILY_LIMIT') &&
        input.dailyMatches >= input.maxProviderMatchesPerDay
      ) {
        failedRules.push('DAILY_LIMIT');
      }
    }

    if (
      input.stage === 'PROVIDER_APPLICATION' &&
      input.providerWebsiteId &&
      !skip('MATCH_SPACING')
    ) {
      const spacingProfile = await client.websiteMatchingProfile.findUnique({
        where: { websiteId: input.providerWebsiteId },
        select: {
          lastApplicationAt: true,
          minHoursBetweenMatches: true,
        },
      });
      const minHours =
        spacingProfile?.minHoursBetweenMatches &&
        spacingProfile.minHoursBetweenMatches > 0
          ? spacingProfile.minHoursBetweenMatches
          : 0;
      if (minHours > 0 && spacingProfile?.lastApplicationAt) {
        const elapsedHours =
          (Date.now() - new Date(spacingProfile.lastApplicationAt).getTime()) /
          3_600_000;
        if (elapsedHours < minHours) {
          failedRules.push('MATCH_SPACING');
        }
      }
    }

    if (requiresEligibility && input.providerDomain && input.stage !== 'ADMIN_FORCE') {
      const providerRootDomain = this.normalizeRootDomain(input.providerDomain);
      if (providerRootDomain) {
        const domainWeeklyCount =
          await this.tierEngine.countDomainWeeklyInteractions(
            providerRootDomain,
            tx,
          );
        if (domainWeeklyCount >= 5) {
          if (skip('DOMAIN_VELOCITY_LIMIT')) {
            overrideApplied = true;
          } else {
            failedRules.push('DOMAIN_VELOCITY_LIMIT');
          }
        }
      }
    }

    if (requiresEligibility && input.actorUserId && input.stage !== 'ADMIN_FORCE') {
      let domainForLimit = input.providerDomain
        ? this.normalizeRootDomain(input.providerDomain)
        : null;
      let profile: any = null;

      if (input.providerWebsiteId) {
        const websiteData = await client.website.findUnique({
          where: { id: input.providerWebsiteId },
          include: { matchingProfile: true, marketplaceCategories: true },
        });
        profile = websiteData?.matchingProfile || null;
        if (!domainForLimit && websiteData) {
          domainForLimit = this.normalizeRootDomain(
            websiteData.rootDomain || websiteData.websiteUrl,
          );
        }

        if (websiteData && !skip('NICHE_CONCENTRATION')) {
          const primaryCategory = websiteData.marketplaceCategories?.find(
            (c) => c.role === 'PRIMARY',
          );
          if (primaryCategory) {
            const nicheLevel = await this.distributionEngine.getNicheConcentrationLevel(
              primaryCategory.categoryId,
              'PRIMARY',
              tx,
            );
            // Defaulting to HARD block per MC-007 compliance if CAPPED
            if (nicheLevel === 'CAPPED') {
              failedRules.push('NICHE_CONCENTRATION_CAPPED');
            }
          }
        }
      }

      if (domainForLimit) {
        const limits = await this.tierEngine.resolveTierLimits(
          input.actorUserId,
          profile,
          tx,
        );
        const domainWeeklyCount =
          await this.tierEngine.countDomainWeeklyInteractions(
            domainForLimit,
            tx,
          );

        if (domainWeeklyCount >= limits.weeklyInteractionLimit) {
          if (skip('WEEKLY_LIMIT')) {
            overrideApplied = true;
          } else {
            failedRules.push('WEEKLY_LIMIT');
          }
        }
      }
    }

    // ---- LEVEL 4: BEHAVIOUR ----
    if (input.providerWebsiteId) {
      if (!skip('PATTERN_FLAG') && input.providerDomain) {
        const patternFlags = await client.patternFlag.findMany({
          where: {
            status: 'OPEN',
            memberDomains: { has: input.providerDomain },
          },
        });
        for (const flag of patternFlags) {
          if (flag.severity === 'HIGH') {
            failedRules.push('HIGH_RISK_PATTERN');
            break;
          } else if (flag.severity === 'MEDIUM') {
            restrictions.push('PATTERN_RESTRICTION');
          }
        }
      }

      const profile = await client.websiteMatchingProfile.findUnique({
        where: { websiteId: input.providerWebsiteId },
        select: {
          riskScore: true,
          marketplaceStatus: true,
          marketplaceStatusDailyCap: true,
        },
      });
      if (requiresEligibility) {
        if (!profile) {
          failedRules.push('MISSING_MATCHING_PROFILE');
        } else if (!this.isBrowsableStatus(profile.marketplaceStatus)) {
          failedRules.push('WEBSITE_STATUS_SUSPENDED');
        } else if (!this.isSelectableStatus(profile.marketplaceStatus)) {
          failedRules.push('WEBSITE_STATUS_NOT_SELECTABLE');
        } else if (this.riskEngine.calculateEffectiveRisk(profile) >= 75) {
          failedRules.push('RISK_THRESHOLD');
        }
        if (profile?.marketplaceStatus === 'RESTRICTED') {
          restrictions.push('BOOST_DISABLED');
        }
      }
    }

    // ---- LEVEL 5: NICHE DISTRIBUTION CAP ----
    if (input.providerWebsiteId && input.stage !== 'ADMIN_FORCE') {
      const website = await client.website.findUnique({
        where: { id: input.providerWebsiteId },
        select: {
          marketplaceCategories: {
            select: { role: true, category: { select: { slug: true } } },
          },
        },
      });
      const primaryCategoryKey = website?.marketplaceCategories?.find(
        (c) => c.role === 'PRIMARY',
      )?.category?.slug;
      if (primaryCategoryKey) {
        const nicheLevel =
          await this.distributionEngine.getNicheConcentrationLevel(
            primaryCategoryKey,
            'PRIMARY',
            tx,
          );
        if (nicheLevel === 'CAPPED') {
          if (skip('NICHE_DISTRIBUTION')) {
            overrideApplied = true;
          } else {
            failedRules.push('NICHE_DISTRIBUTION');
          }
        }
      }
    }

    // ---- LEVEL 6: OPTIMIZATION (non-blocking) ----

    // ---- DECISION ----
    let decision: ValidationDecision;
    let publicMessage = getSafeMessage('GENERIC');
    if (failedRules.length === 0) {
      decision =
        restrictions.length > 0 ? 'APPROVED_WITH_RESTRICTIONS' : 'APPROVED';
    } else if (overrideApplied) {
      decision =
        restrictions.length > 0 ? 'APPROVED_WITH_RESTRICTIONS' : 'APPROVED';
    } else if (['APPLY', 'CREATE', 'DIRECT_REQUEST'].includes(input.stage)) {
      // Soft Advisory Mode: Task creation, applications, and direct task requests execute
      // without embargoes or hard blocks. Rule warnings are appended to restrictions.
      decision = 'APPROVED_WITH_RESTRICTIONS';
      restrictions.push(...failedRules);
    } else {
      console.log('DEBUG: Validation failed rules:', failedRules);
      decision = 'REJECTED';
      publicMessage =
        failedRules.includes('DOMAIN_COOLDOWN') ||
        failedRules.includes('DAILY_LIMIT') ||
        failedRules.includes('WEEKLY_LIMIT') ||
        failedRules.includes('DOMAIN_VELOCITY_LIMIT') ||
        failedRules.includes('MATCH_SPACING')
          ? getSafeMessage('COOLDOWN')
          : `ELIGIBILITY: ${failedRules.join(', ')}`;
    }
    result.decision = decision;
    result.publicMessage = publicMessage;
    result.overrideApplied = overrideApplied;

    await this.logValidation(input, result);
    if (overrideApplied && input.adminOverride) {
      const ov = input.adminOverride;
      const affectedDomains = [
        ...new Set([
          ...(ov.affectedDomains ?? []),
          ...(input.providerDomain
            ? [this.normalizeRootDomain(input.providerDomain)]
            : []),
          ...(input.requesterDomain
            ? [this.normalizeRootDomain(input.requesterDomain)]
            : []),
        ]),
      ].filter(Boolean);

      // Audit R8 (restore): clear reciprocal/repeat cooldown on the pair stat.
      if (ov.restore && input.providerDomain && input.requesterDomain) {
        const pairKey = this.buildPairKey(
          this.normalizeRootDomain(input.providerDomain),
          this.normalizeRootDomain(input.requesterDomain),
        );
        await client.domainPairStat
          .updateMany({
            where: { normalizedPairKey: pairKey },
            data: {
              reciprocalCooldownUntil: null,
              repeatPairCooldownUntil: null,
            },
          })
          .catch(() => {
            /* non-fatal */
          });
      }

      // Audit R-Repeat-6: a scoped REPEAT_PAIR restore clears only the repeat
      // cooldown (reciprocal cooldown stays intact for genuine reciprocal cycling).
      if (
        ov.scope === 'REPEAT_PAIR' &&
        ov.restore &&
        input.providerDomain &&
        input.requesterDomain
      ) {
        const pairKey = this.buildPairKey(
          this.normalizeRootDomain(input.providerDomain),
          this.normalizeRootDomain(input.requesterDomain),
        );
        await client.domainPairStat
          .updateMany({
            where: { normalizedPairKey: pairKey },
            data: { repeatPairCooldownUntil: null },
          })
          .catch(() => {
            /* non-fatal */
          });
      }

      await client.adminActionLog
        .create({
          data: {
            adminId: ov.adminId,
            action: ov.restore ? 'OVERRIDE_RESTORED' : 'OVERRIDE_APPLIED',
            targetType: input.taskId ? 'TASK' : 'WEBSITE',
            targetId: input.taskId || input.providerWebsiteId,
            reasonCode: ov.reasonCode,
            newValue: { rule: ov.rule, affectedDomains },
            expiresAt: ov.expiresAt ? new Date(ov.expiresAt) : null,
          },
        })
        .catch(() => {
          /* audit must never block marketplace operation */
        });
    }
    return result;
  }

  private isDirectionAllowed(
    pairStat: {
      lastSourceDomain: string | null;
      lastTargetDomain: string | null;
    },
    sourceDomain: string,
    targetDomain: string,
    repeatCooldownUntil: Date | null,
    reciprocalCooldownUntil: Date | null,
  ): boolean {
    const now = new Date();
    const sameDirectionAsLast =
      pairStat.lastSourceDomain === sourceDomain &&
      pairStat.lastTargetDomain === targetDomain;
    if (sameDirectionAsLast) {
      return !(repeatCooldownUntil && repeatCooldownUntil > now);
    }
    return !(reciprocalCooldownUntil && reciprocalCooldownUntil > now);
  }

  private async canMatchWithWindows(
    sourceDomain: string,
    targetDomain: string,
    repeatDays: number,
    reciprocalDays: number,
    tx?: import('@prisma/client').Prisma.TransactionClient | import('../../../prisma/prisma.service').PrismaService,
  ): Promise<boolean> {
    const normalizedSource = this.normalizeRootDomain(sourceDomain);
    const normalizedTarget = this.normalizeRootDomain(targetDomain);
    if (
      !normalizedSource ||
      !normalizedTarget ||
      normalizedSource === normalizedTarget
    ) {
      return false;
    }
    const pairKey = this.buildPairKey(normalizedSource, normalizedTarget);
    const client = tx ?? this.prisma;
    const pairStat = await client.domainPairStat.findUnique({
      where: { normalizedPairKey: pairKey },
    });
    if (!pairStat) return true;
    const now = new Date();
    const repeatCooldownUntil =
      repeatDays > 0 ? pairStat.repeatPairCooldownUntil : null;
    const reciprocalCooldownUntil =
      reciprocalDays > 0 ? pairStat.reciprocalCooldownUntil : null;
    return this.isDirectionAllowed(
      pairStat,
      normalizedSource,
      normalizedTarget,
      repeatCooldownUntil && repeatCooldownUntil > now
        ? repeatCooldownUntil
        : null,
      reciprocalCooldownUntil && reciprocalCooldownUntil > now
        ? reciprocalCooldownUntil
        : null,
    );
  }

  private async logValidation(
    input: {
      actorUserId: string;
      providerWebsiteId?: string;
      requesterWebsiteId?: string;
      taskId?: string;
      stage: MarketplaceValidationContext;
    },
    result: ValidationResult,
  ) {
    // Audit R-Repeat-2: correlate validation to the active marketplace mode.
    const marketplaceMode = await this.getActiveMarketplaceMode().catch(
      () => 'EARLY_STAGE' as const,
    );
    await this.prisma.marketplaceValidationLog
      .create({
        data: {
          userId: input.actorUserId,
          websiteId: input.providerWebsiteId ?? input.requesterWebsiteId,
          taskId: input.taskId,
          stage: input.stage,
          decision: result.decision,
          failedRule: result.failedRules[0] ?? null,
          marketplaceMode,
          overrideApplied: result.overrideApplied,
        },
      })
      .catch(() => {
        // validation logging must never block the marketplace operation
      });
  }
}
