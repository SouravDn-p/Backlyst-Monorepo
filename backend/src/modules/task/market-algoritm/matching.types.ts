export type TaxonomyCategoryReference = {
  id: string;
  slug: string;
  role: 'PRIMARY' | 'SECONDARY';
  parentId: string | null;
};

export type TaxonomyTagReference = {
  id: string;
  slug: string;
};

export type OpportunityFilters = {
  providerWebsiteId?: string;
  placementType?: string;
  linkAttribute?: string;
  status?: string;
  country?: string;
  industry?: string;
  page?: number;
  limit?: number;
  domainPool?: 'LIMITED' | 'IMPROVED' | 'PREMIUM';
};

export type MatchingProviderWebsite = {
  id: string;
  authorId: string;
  rootDomain: string;
  websiteUrl: string;
  industry: string;
  country: string | null;
  language: string | null;
  domainRating: number | null;
  marketplaceCategories: TaxonomyCategoryReference[];
  marketplaceTags: TaxonomyTagReference[];
  matchingProfile?: {
    visibilityScore: number;
    opportunityScore: number;
    reputationScore: number;
    boostFactor: number;
    riskScore: number;
    lastRiskReason?: string | null;
    lastRiskEventAt?: Date | null;
    isSuppressed: boolean;
    suppressedUntil: Date | null;
    forceMatchNext: boolean;
    lastMatchedAt: Date | null;
    exposureCount7d?: number;
    firstSuccessBoostActive?: boolean | null;
    internalPriorityScore?: number | null;
    diversityScore?: number | null;
    forceNewDomainNext?: boolean | null;
    forceNewDomainUntil?: Date | null;
    marketplaceStatus?: string | null;
    marketplaceStatusDailyCap?: number | null;
    behaviourScore?: number | null;
    // Spec §7/§10: internal (hidden) quality score consumed as a ranking signal.
    qualityScore?: number | null;
  } | null;
};

export type MatchingTask = Record<string, any> & {
  id: string;
  requesterId: string;
  requesterWebsiteId: string;
  placementType: string;
  linkAttribute: string;
  requiredDomainRating?: number | null;
  country?: string | null;
  language?: string | null;
  requester?: any;
  _count?: any;
};

export type MatchCandidate = {
  task: MatchingTask;
  providerWebsite: MatchingProviderWebsite;
  requesterWebsite: {
    id: string;
    rootDomain: string | null;
    websiteUrl: string;
    industry: string;
    country: string | null;
    language: string | null;
    marketplaceCategories: TaxonomyCategoryReference[];
    marketplaceTags: TaxonomyTagReference[];
    matchingProfile?: {
      completionRate: number;
      reliabilityScore: number;
      avgQualityRating: number;
    } | null;
  };
  compatibilityScore: number;
  relaxationLevel: number;
  matchingAttributes: {
    category:
      'EXACT' | 'RELATED' | 'BROAD' | 'LEGACY_FALLBACK' | 'UNRELATED' | 'NONE';
    tags: 'EXACT' | 'PARTIAL' | 'ANY';
    country: 'EXACT' | 'ANY' | 'UNKNOWN';
    language: 'EXACT' | 'ANY' | 'UNKNOWN';
    authority: 'MEETS' | 'BELOW' | 'UNKNOWN';
  };
  reasons: string[];
  priorityBucket?: 'NEVER_INTERACTED' | 'RARELY_USED' | 'PREVIOUSLY_USED';
  nicheConcentration?: 'LOW' | 'MODERATE' | 'HIGH' | 'CAPPED';
};

export type RankedMatchCandidate = MatchCandidate & {
  score: number;
  rank: number;
};
