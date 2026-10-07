export interface MatchingMetadata {
  fitScore: number;
  isVerifiedMatch: boolean;
  isTierCompatible: boolean;
  requiresUpgrade: boolean;
  isCooldownActive: boolean;
  isSelfDomainMatch: boolean;
  isSelfCreated: boolean;
}

export interface EnrichedOpportunityItem {
  id: string;
  title: string;
  placementType: string;
  linkAttribute: string;
  requiredDomainRating?: number;
  requesterWebsite?: any;
  matchingMetadata: MatchingMetadata;
  [key: string]: any;
}
