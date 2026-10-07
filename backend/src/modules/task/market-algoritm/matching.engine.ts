import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ValidationEngine } from './validation.engine';
import { MatchingRelaxationEngine } from './matching-relaxation.engine';
import {
  MatchCandidate,
  MatchingProviderWebsite,
  MatchingTask,
  OpportunityFilters,
} from './matching.types';
import { clampScore } from './scoring.utils';

/**
 * MatchingEngine — dedicated marketplace matching engine.
 *
 * Sole responsibilities (spec §1 / Output Validation §10):
 *   1. Eligible candidate generation (provider/requester/task eligibility +
 *      ownership + verification + domain cooldown hard-rule filtering).
 *   2. Compatibility matching (boolean/categorical attribute comparison only —
 *      NOT a weighted ranking/opportunity/quality score).
 *   3. Candidate selection (relaxation-driven selection of the viable set).
 *   4. Progressive matching relaxation (delegated to MatchingRelaxationEngine).
 *   5. Low-pool support (detection + fallback expansion without relaxing the
 *      hard rules).
 *
 * This engine MUST NOT perform: ranking, visibility, risk scoring, quality
 * scoring, tier, notification, credit, dispute, or analytics work.
 *
 * Out-of-scope concerns are delegated to the engines that own them:
 *   - Distribution (forceNewDomainNext diversification) -> DistributionEngine
 *     (called by the orchestrator before/around matching, not inside it).
 *   - Administrative overrides (FORCE_MATCH) -> MarketplaceOverrideService
 *     (resolved by ranking/governance, not matching).
 *   - Analytics / audit logging -> caller (e.g. ProviderTaskService) via the
 *     returned MatchResult metadata, NOT written here.
 *   - Low-pool thresholds (minViableMatches / maxRelaxationLevel) -> passed in
 *     via MatchingContext. The low-pool mode itself (NORMAL | LOW_POOL) is
 *     derived internally from candidate counts, NOT read from config.mode
 *     (which is the separate EARLY_STAGE | SCALING config-mode axis).
 */
@Injectable()
export class MatchingEngine {
  private readonly openLifecycleStatuses = ['OPEN', 'WAITING_FOR_APPLICANTS'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly validationEngine: ValidationEngine,
    private readonly relaxationEngine: MatchingRelaxationEngine,
  ) {}

  /**
   * Inputs that the engine requires but does NOT own. They are resolved by the
   * caller (orchestrator / controller) so the engine never performs config,
   * analytics, or governance work itself.
   */
  async findCandidates(
    providerId: string,
    filters: OpportunityFilters,
    context: MatchingContext,
  ): Promise<MatchResult> {
    const startedAt = Date.now();

    // --- Eligibility gates (delegated validation, not analytics) -----------
    const isUserActive = await this.validationEngine.isUserActive(providerId);
    if (!isUserActive) {
      return this.emptyResult(providerId, startedAt);
    }

    const eligibleProviderWebsites = this.filterProviderWebsitesByQuery(
      await this.getEligibleProviderWebsiteRows(providerId),
      filters.providerWebsiteId,
    );
    if (eligibleProviderWebsites.length === 0) {
      return this.emptyResult(providerId, startedAt);
    }

    // Spec §17: Validation Engine must execute when matches are generated.
    // Check if the provider is eligible (risk, limits, pattern flags, status).
    const providerValidation = await this.validationEngine.validateTransition({
      stage: 'GENERATE',
      actorUserId: providerId,
      providerWebsiteId: eligibleProviderWebsites[0].id,
      providerDomain: eligibleProviderWebsites[0].rootDomain,
    });

    if (providerValidation.decision === 'REJECTED') {
      return this.emptyResult(providerId, startedAt);
    }

    const eligibleRequesterWebsiteIds =
      await this.validationEngine.getEligibleMarketplaceWebsiteIds();
    if (eligibleRequesterWebsiteIds.length === 0) {
      return this.emptyResult(
        providerId,
        startedAt,
        eligibleProviderWebsites[0].id,
      );
    }

    const tasks = await this.getCandidateTasks(
      providerId,
      eligibleRequesterWebsiteIds,
      filters,
    );
    if (tasks.length === 0) {
      return this.emptyResult(
        providerId,
        startedAt,
        eligibleProviderWebsites[0].id,
      );
    }

    // --- Eligible candidate generation (hard rules only) -------------------
    const requesterWebsites = await this.getRequesterWebsiteMap(tasks);
    const hardRuleCandidates = await this.buildHardRuleCandidates(
      eligibleProviderWebsites,
      tasks,
      requesterWebsites,
      filters.domainPool,
    );

    // --- Low-pool detection (support only; hard rules never relaxed) -------
    // Audit label stays `LOW_POOL` / `NORMAL` regardless of the config mode.
    const marketplaceMode =
      hardRuleCandidates.length < context.minViableMatches
        ? 'LOW_POOL'
        : 'NORMAL';

    // --- Progressive matching relaxation + candidate selection -------------
    let selected: MatchCandidate[] = [];
    let selectedLevel = 0;
    for (let level = 0; level <= context.maxRelaxationLevel; level += 1) {
      selectedLevel = level;
      selected = hardRuleCandidates
        .map((candidate) => this.applyRelaxation(candidate, level))
        .filter((candidate): candidate is MatchCandidate => Boolean(candidate));

      if (
        selected.length >= context.minViableMatches ||
        level === context.maxRelaxationLevel
      ) {
        break;
      }
    }

    // Analytics/audit is the caller's responsibility (see MatchResult). The
    // engine only surfaces the data needed to log; it does NOT write logs.
    return {
      candidates: selected,
      metadata: {
        providerWebsiteCount: eligibleProviderWebsites.length,
        taskCount: tasks.length,
        hardRuleCandidateCount: hardRuleCandidates.length,
        relaxationLevel: selectedLevel,
        marketplaceMode,
        processingTimeMs: Date.now() - startedAt,
      },
    };
  }

  /**
   * Empty result helper. Mirrors the previous safe "no candidates" behaviour
   * without performing any analytics writes inside the engine.
   *
   * The marketplace mode is stamped as `LOW_POOL` because an empty result means
   * there were no viable hard-rule candidates (no eligible supply / no eligible
   * provider websites / no eligible tasks). This is the correct low-pool axis
   * (`NORMAL` | `LOW_POOL`) and must NOT be confused with the config-mode axis
   * (`EARLY_STAGE` | `SCALING`) that lives in MarketplaceModeConfig. Stamping
   * the config mode here previously corrupted MatchingAuditLog analytics.
   */
  private emptyResult(
    providerId: string,
    startedAt: number,
    websiteId?: string,
  ): MatchResult {
    return {
      candidates: [],
      metadata: {
        providerWebsiteCount: 0,
        taskCount: 0,
        hardRuleCandidateCount: 0,
        relaxationLevel: 0,
        marketplaceMode: 'LOW_POOL',
        processingTimeMs: Date.now() - startedAt,
      },
      providerId,
      websiteId,
    };
  }

  private async getEligibleProviderWebsiteRows(
    providerId: string,
  ): Promise<MatchingProviderWebsite[]> {
    const eligible =
      await this.validationEngine.getEligibleProviderWebsites(providerId);
    const eligibleIds = eligible.map((website) => website.id);
    if (eligibleIds.length === 0) return [];

    const websites = await this.prisma.website.findMany({
      where: { id: { in: eligibleIds } },
      include: {
        marketplaceCategories: {
          select: {
            role: true,
            category: { select: { id: true, slug: true, parentId: true } },
          },
        },
        marketplaceTags: {
          select: { tag: { select: { id: true, slug: true } } },
        },
        matchingProfile: {
          select: {
            forceMatchNext: true,
            forceNewDomainNext: true,
            forceNewDomainUntil: true,
            lastMatchedAt: true,
          },
        },
      },
    });

    return websites.map((website: any) => {
      return {
        id: website.id,
        authorId: website.authorId,
        rootDomain: this.validationEngine.normalizeRootDomain(
          website.rootDomain || website.websiteUrl,
        ),
        websiteUrl: website.websiteUrl,
        industry: website.industry,
        country: this.normalizeCountry(website.country),
        language: this.normalizeLanguage(website.language),
        domainRating: website.domainRating,
        marketplaceCategories:
          website.marketplaceCategories?.map((c: any) => ({
            id: c.category.id,
            slug: c.category.slug,
            role: c.role,
            parentId: c.category.parentId,
          })) ?? [],
        marketplaceTags:
          website.marketplaceTags?.map((t: any) => ({
            id: t.tag.id,
            slug: t.tag.slug,
          })) ?? [],
        matchingProfile: website.matchingProfile ?? null,
      };
    });
  }

  private filterProviderWebsitesByQuery(
    websites: MatchingProviderWebsite[],
    providerWebsiteId?: string,
  ): MatchingProviderWebsite[] {
    const selectedWebsiteId = providerWebsiteId?.trim();
    if (!selectedWebsiteId) {
      return websites;
    }

    return websites.filter((website) => website.id === selectedWebsiteId);
  }

  private async getCandidateTasks(
    providerId: string,
    eligibleRequesterWebsiteIds: string[],
    filters: OpportunityFilters,
  ): Promise<MatchingTask[]> {
    if (
      filters.status &&
      !this.openLifecycleStatuses.includes(filters.status)
    ) {
      throw new BadRequestException(
        `status must be one of: ${this.openLifecycleStatuses.join(', ')}`,
      );
    }

    const requesterWebsiteIds = await this.filterRequesterWebsiteIds(
      eligibleRequesterWebsiteIds,
      filters,
    );

    if (requesterWebsiteIds.length === 0) {
      return [];
    }

    const where: any = {
      requesterId: { not: providerId },
      requesterWebsiteId: { in: requesterWebsiteIds },
      lifecycleStatus: filters.status
        ? filters.status
        : { in: this.openLifecycleStatuses },
      selectedProviderId: null,
      assignedProviderWebsiteId: null,
      placementApplications: { none: { providerId } },
    };

    if (filters.placementType) where.placementType = filters.placementType;
    if (filters.linkAttribute) where.linkAttribute = filters.linkAttribute;

    return this.prisma.placementTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
        _count: { select: { placementApplications: true } },
      },
    }) as Promise<MatchingTask[]>;
  }

  private async filterRequesterWebsiteIds(
    eligibleRequesterWebsiteIds: string[],
    filters: OpportunityFilters,
  ): Promise<string[]> {
    const country = filters.country?.trim();
    const industry = filters.industry?.trim();

    if (!country && !industry) {
      return eligibleRequesterWebsiteIds;
    }

    const websites = await this.prisma.website.findMany({
      where: {
        id: { in: eligibleRequesterWebsiteIds },
        ...(country
          ? {
              country: {
                contains: country,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(industry
          ? {
              industry: {
                contains: industry,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      select: { id: true },
    });

    return websites.map((website) => website.id);
  }

  private async getRequesterWebsiteMap(tasks: MatchingTask[]) {
    const websites = await this.prisma.website.findMany({
      where: {
        id: {
          in: [...new Set(tasks.map((task) => task.requesterWebsiteId))],
        },
      },
      include: {
        marketplaceCategories: {
          select: {
            role: true,
            category: { select: { id: true, slug: true, parentId: true } },
          },
        },
        marketplaceTags: {
          select: { tag: { select: { id: true, slug: true } } },
        },
        matchingProfile: {
          select: {
            completionRate: true,
            reliabilityScore: true,
            avgQualityRating: true,
          },
        },
      },
    });

    return new Map<string, any>(
      websites.map((website: any) => [
        website.id,
        {
          ...website,
          marketplaceCategories:
            website.marketplaceCategories?.map((c: any) => ({
              id: c.category.id,
              slug: c.category.slug,
              role: c.role,
              parentId: c.category.parentId,
            })) ?? [],
          marketplaceTags:
            website.marketplaceTags?.map((t: any) => ({
              id: t.tag.id,
              slug: t.tag.slug,
            })) ?? [],
        },
      ]),
    );
  }

  private async buildHardRuleCandidates(
    providerWebsites: MatchingProviderWebsite[],
    tasks: MatchingTask[],
    requesterWebsites: Map<string, any>,
    domainPool?: 'LIMITED' | 'IMPROVED' | 'PREMIUM',
  ): Promise<MatchCandidate[]> {
    const providerDomains = [
      ...new Set(providerWebsites.map((website) => website.rootDomain)),
    ];
    const requesterDomains = [
      ...new Set(
        [...requesterWebsites.values()]
          .map((website) =>
            this.validationEngine.normalizeRootDomain(
              website.rootDomain || website.websiteUrl,
            ),
          )
          .filter(Boolean),
      ),
    ];
    const blockedPairKeys =
      await this.validationEngine.getCooldownBlockedPairKeys(
        providerDomains,
        requesterDomains,
      );

    const allCategoryIds = new Set<string>();
    for (const pw of providerWebsites) {
      pw.marketplaceCategories.forEach((c) => allCategoryIds.add(c.id));
      pw.marketplaceCategories.forEach((c) => {
        if (c.parentId) allCategoryIds.add(c.parentId);
      });
    }
    for (const rw of requesterWebsites.values()) {
      rw.marketplaceCategories.forEach((c: any) => allCategoryIds.add(c.id));
      rw.marketplaceCategories.forEach((c: any) => {
        if (c.parentId) allCategoryIds.add(c.parentId);
      });
    }
    const relations = await this.prisma.marketplaceCategoryRelation.findMany({
      where: {
        OR: [
          { sourceId: { in: [...allCategoryIds] } },
          { targetId: { in: [...allCategoryIds] } },
        ],
      },
    });

    const candidates: MatchCandidate[] = [];

    for (const task of tasks) {
      const requesterWebsite = requesterWebsites.get(task.requesterWebsiteId);
      if (!requesterWebsite) continue;

      const requesterDomain = this.validationEngine.normalizeRootDomain(
        requesterWebsite.rootDomain || requesterWebsite.websiteUrl,
      );
      if (!requesterDomain) continue;

      // Spec §16: Apply Domain Pool access restriction.
      const reqDr = requesterWebsite.domainRating || 0;
      if (domainPool === 'LIMITED' && reqDr > 40) continue;
      if (domainPool === 'IMPROVED' && reqDr > 70) continue;

      for (const providerWebsite of providerWebsites) {
        if (
          !providerWebsite.rootDomain ||
          providerWebsite.rootDomain === requesterDomain
        ) {
          continue;
        }

        const pairKey = this.validationEngine.buildOrderedPairKey(
          providerWebsite.rootDomain,
          requesterDomain,
        );
        if (blockedPairKeys.has(pairKey)) {
          continue;
        }

        candidates.push(
          this.buildCandidate(
            task,
            providerWebsite,
            requesterWebsite,
            relations,
          ),
        );
      }
    }

    return candidates;
  }

  private buildCandidate(
    task: MatchingTask,
    providerWebsite: MatchingProviderWebsite,
    requesterWebsite: any,
    relations: any[],
  ): MatchCandidate {
    const taskCountry = this.normalizeCountry(
      task.country || requesterWebsite.country,
    );
    const taskLanguage = this.normalizeLanguage(task.language);
    const requesterTags = this.normalizeTags(
      requesterWebsite.marketplaceTags ?? [],
    );
    const providerTags = this.normalizeTags(
      providerWebsite.marketplaceTags ?? [],
    );

    const pPrimary = providerWebsite.marketplaceCategories.find(
      (c) => c.role === 'PRIMARY',
    );
    const pSecondary = providerWebsite.marketplaceCategories.find(
      (c) => c.role === 'SECONDARY',
    );
    const rPrimary = requesterWebsite.marketplaceCategories.find(
      (c: any) => c.role === 'PRIMARY',
    );
    const rSecondary = requesterWebsite.marketplaceCategories.find(
      (c: any) => c.role === 'SECONDARY',
    );

    let categoryMatch:
      'EXACT' | 'RELATED' | 'BROAD' | 'LEGACY_FALLBACK' | 'UNRELATED' | 'NONE' =
      'NONE';

    // EXACT match
    if (rPrimary && pPrimary && pPrimary.id === rPrimary.id) {
      categoryMatch = 'EXACT';
    } else if (rPrimary && pSecondary && pSecondary.id === rPrimary.id) {
      categoryMatch = 'EXACT';
    } else if (rSecondary && pPrimary && pPrimary.id === rSecondary.id) {
      categoryMatch = 'EXACT';
    } else if (rPrimary && pPrimary) {
      // RELATED match
      // Direction semantics: provider category (source) -> requester category (target) or vice versa
      const isRelated = relations.some(
        (r) =>
          (r.sourceId === pPrimary.id && r.targetId === rPrimary.id) ||
          (r.sourceId === rPrimary.id && r.targetId === pPrimary.id),
      );
      if (isRelated) {
        categoryMatch = 'RELATED';
      } else {
        // BROAD match
        const isBroad =
          pPrimary.parentId === rPrimary.id ||
          rPrimary.parentId === pPrimary.id ||
          (pPrimary.parentId && pPrimary.parentId === rPrimary.parentId);
        if (isBroad) {
          categoryMatch = 'BROAD';
        } else {
          categoryMatch = 'UNRELATED';
        }
      }
    } else if (!rPrimary && !pPrimary) {
      // LEGACY_FALLBACK
      const industryRelated =
        this.normalizeText(providerWebsite.industry) ===
          this.normalizeText(requesterWebsite.industry) &&
        providerWebsite.industry !== '';
      if (industryRelated) {
        categoryMatch = 'LEGACY_FALLBACK';
      } else {
        categoryMatch = 'UNRELATED';
      }
    } else {
      categoryMatch = 'UNRELATED';
    }

    const tagOverlap = this.countTagOverlap(providerTags, requesterTags);
    const countryExact =
      Boolean(taskCountry) && providerWebsite.country === taskCountry;
    const languageExact =
      Boolean(taskLanguage) && providerWebsite.language === taskLanguage;
    const requiredDr = Number(task.requiredDomainRating ?? 0);
    const providerDr = providerWebsite.domainRating;
    const authorityMeets =
      requiredDr <= 0 ||
      (typeof providerDr === 'number' && providerDr >= requiredDr);

    return {
      task,
      providerWebsite,
      requesterWebsite: {
        id: requesterWebsite.id,
        rootDomain: requesterWebsite.rootDomain,
        websiteUrl: requesterWebsite.websiteUrl,
        industry: requesterWebsite.industry,
        country: this.normalizeCountry(requesterWebsite.country),
        language: this.normalizeLanguage(requesterWebsite.language),
        marketplaceCategories: requesterWebsite.marketplaceCategories ?? [],
        marketplaceTags: requesterWebsite.marketplaceTags ?? [],
        matchingProfile: requesterWebsite.matchingProfile ?? null,
      },
      // Categorical compatibility signal ONLY (not a weighted ranking score).
      // It is a coarse 0-100 compatibility indication used for *matching*
      // debugging/transparency, never for ordering — ranking is the sole
      // responsibility of RankingService.
      compatibilityScore: this.calculateCompatibility({
        categoryMatch,
        tagOverlap,
        requesterTagCount: requesterTags.length,
        countryExact,
        taskCountry,
        languageExact,
        taskLanguage,
        authorityMeets,
        requiredDr,
        providerDr,
      }),
      relaxationLevel: 4,
      matchingAttributes: {
        category: categoryMatch,
        tags:
          requesterTags.length > 0 && tagOverlap === requesterTags.length
            ? 'EXACT'
            : tagOverlap > 0
              ? 'PARTIAL'
              : 'ANY',
        country: taskCountry ? (countryExact ? 'EXACT' : 'ANY') : 'UNKNOWN',
        language: taskLanguage ? (languageExact ? 'EXACT' : 'ANY') : 'UNKNOWN',
        authority:
          requiredDr <= 0 ? 'UNKNOWN' : authorityMeets ? 'MEETS' : 'BELOW',
      },
      reasons: [],
    };
  }

  private applyRelaxation(
    candidate: MatchCandidate,
    level: number,
  ): MatchCandidate | null {
    // Delegated to the dedicated relaxation engine (spec §3). Behaviour is
    // identical to the previous inline implementation; the engine adds a
    // semantic stage label (EXACT / RELATED / BROAD / FALLBACK) to reasons.
    return this.relaxationEngine.apply(candidate, level);
  }

  /**
   * Compatibility matching signal.
   *
   * This is a categorical compatibility indication — it aggregates the
   * pass/fail of each matching dimension into a single 0-100 number purely for
   * transparency/debugging. It is NOT an opportunity-weight, visibility,
   * quality, or risk score, and it must NEVER be used as the final ordering
   * (that is RankingService's job). It does not consume visibilityScore,
   * opportunityScore, reputationScore, riskScore, qualityScore, or boostFactor.
   */
  private calculateCompatibility(input: {
    categoryMatch:
      'EXACT' | 'RELATED' | 'BROAD' | 'LEGACY_FALLBACK' | 'UNRELATED' | 'NONE';
    tagOverlap: number;
    requesterTagCount: number;
    countryExact: boolean;
    taskCountry: string | null;
    languageExact: boolean;
    taskLanguage: string | null;
    authorityMeets: boolean;
    requiredDr: number;
    providerDr: number | null;
  }) {
    let score = 35;
    if (input.categoryMatch === 'EXACT') score += 25;
    else if (input.categoryMatch === 'RELATED') score += 18;
    else if (input.categoryMatch === 'BROAD') score += 12;
    else if (input.categoryMatch === 'LEGACY_FALLBACK') score += 12;

    if (input.requesterTagCount > 0) {
      score += Math.min(20, (input.tagOverlap / input.requesterTagCount) * 20);
    }

    if (!input.taskCountry || input.countryExact) score += 10;
    if (!input.taskLanguage || input.languageExact) score += 10;
    // DA/DR is promoted into the compatibility signal: meeting or exceeding the
    // required Domain Rating is rewarded, an unknown requirement is treated as
    // neutral-positive, and falling below the requirement is still penalised.
    // A final hard Moz gate still runs at apply time in provider-task.service.ts.
    if (input.requiredDr <= 0) score += 10;
    else if (input.authorityMeets) score += 15;
    else score -= 15;

    return clampScore(Math.round(score), 0, 100);
  }

  private normalizeTags(tags: any[]) {
    return tags
      .map((tag) => this.normalizeText(tag.slug || tag.tag))
      .filter((tag) => tag.length > 0);
  }

  private countTagOverlap(a: string[], b: string[]) {
    const bSet = new Set(b);
    return a.filter((tag) => bSet.has(tag)).length;
  }

  private normalizeCountry(value?: string | null) {
    return value?.trim().toUpperCase() || null;
  }

  private normalizeLanguage(value?: string | null) {
    return value?.trim().toLowerCase() || null;
  }

  private normalizeText(value?: string | null) {
    return value?.trim().toLowerCase() || '';
  }
}

export type MarketplaceMode = 'NORMAL' | 'LOW_POOL';

/**
 * Inputs required by the MatchingEngine but owned by other layers. The engine
 * receives them as validated inputs (spec §3) rather than deriving config,
 * analytics, or governance state itself.
 */
export type MatchingContext = {
  minViableMatches: number;
  maxRelaxationLevel: number;
};

/**
 * Result of a matching run. Carries the selected candidates plus the metadata
 * the CALLER needs to perform analytics/audit logging. The engine itself does
 * not write any analytics records.
 */
export type MatchResult = {
  candidates: MatchCandidate[];
  metadata: {
    providerWebsiteCount: number;
    taskCount: number;
    hardRuleCandidateCount: number;
    relaxationLevel: number;
    marketplaceMode: MarketplaceMode;
    processingTimeMs: number;
  };
  providerId?: string;
  websiteId?: string;
};
