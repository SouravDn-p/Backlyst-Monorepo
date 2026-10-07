import { MatchingMetadata } from '../interfaces/matching-metadata.interface';

export interface ProviderContext {
  id: string;
  tier: 'LIMITED' | 'IMPROVED' | 'PREMIUM';
  isVerified: boolean;
  rootDomains: string[];
}

export function calculateOpportunityScore(
  provider: ProviderContext,
  task: any,
  cooldownBlockedPairs: Set<string>,
): { score: number; metadata: MatchingMetadata } {
  let score = 1000;

  const metadata: MatchingMetadata = {
    fitScore: 0,
    isVerifiedMatch: true,
    isTierCompatible: true,
    requiresUpgrade: false,
    isCooldownActive: false,
    isSelfDomainMatch: false,
    isSelfCreated: false,
  };

  // 1. Provider & Site Verification Score
  const isRequesterVerified = task.requesterWebsite?.verificationStatus === 'VERIFIED';
  if (!provider.isVerified || !isRequesterVerified) {
    score -= 400;
    metadata.isVerifiedMatch = false;
  } else {
    score += 300;
  }

  // 2. Tier DR Affinity Score
  const requesterDR = task.requesterWebsite?.domainRating ?? task.requiredDomainRating ?? 0;
  const maxTierDR = provider.tier === 'LIMITED' ? 40 : provider.tier === 'IMPROVED' ? 70 : 100;

  if (requesterDR > maxTierDR) {
    score -= 300;
    metadata.isTierCompatible = false;
    metadata.requiresUpgrade = true;
  } else {
    score += 150;
  }

  // 3. Domain Pair Cooldown Penalty & Self-Domain Match
  const requesterDomain = (task.requesterWebsite?.rootDomain ?? '').toLowerCase();
  const providerDomains = (provider.rootDomains || []).map((d) => (d || '').toLowerCase());
  const primaryProviderDomain = providerDomains[0] ?? '';

  const isSelfDomain = providerDomains.some((d) => d && requesterDomain && d === requesterDomain);

  if (isSelfDomain) {
    score -= 800;
    metadata.isSelfDomainMatch = true;
  } else {
    const isCooldown = providerDomains.some((pDomain) =>
      cooldownBlockedPairs.has(`${pDomain}:${requesterDomain}`),
    ) || (primaryProviderDomain && requesterDomain && cooldownBlockedPairs.has(`${primaryProviderDomain}:${requesterDomain}`));

    if (isCooldown) {
      score -= 250;
      metadata.isCooldownActive = true;
    }
  }

  // 4. Self-Created Task Demotion (Allows inspection without hiding)
  if (task.requesterId === provider.id) {
    score -= 900;
    metadata.isSelfCreated = true;
  }

  // 5. Freshness Bonus (Decays over 48 hours)
  const createdAtTime = task.createdAt ? new Date(task.createdAt).getTime() : Date.now();
  const ageInHours = (Date.now() - createdAtTime) / (1000 * 60 * 60);
  const freshnessBonus = Math.max(0, 100 - ageInHours * 2);
  score += Math.round(freshnessBonus);

  metadata.fitScore = score;
  return { score, metadata };
}
