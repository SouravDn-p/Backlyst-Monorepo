import {
  RankingPeriod,
  ShowcaseEntityType,
  ShowcaseSection,
} from '@prisma/client';

export type CommunityShowcaseRankingType = 'AUTO' | 'ADMIN_CURATED';

export type ShowcaseSectionDescriptor = {
  key: ShowcaseSection;
  label: string;
  entityType: ShowcaseEntityType;
  rankingType: CommunityShowcaseRankingType;
  description: string;
  defaultPeriod: RankingPeriod;
  supportedPeriods: RankingPeriod[];
};

const SHARED_AUTO_PERIODS = [
  RankingPeriod.ALL_TIME,
  RankingPeriod.THIS_WEEK,
  RankingPeriod.THIS_MONTH,
  RankingPeriod.LAST_30_DAYS,
  RankingPeriod.THIS_YEAR,
] as const;

export const COMMUNITY_SHOWCASE_SECTIONS: ShowcaseSectionDescriptor[] = [
  {
    key: ShowcaseSection.TOP_CONTRIBUTORS,
    label: 'Top Contributors',
    entityType: ShowcaseEntityType.USER,
    rankingType: 'AUTO',
    description: 'Members with strong approved contribution and quality.',
    defaultPeriod: RankingPeriod.ALL_TIME,
    supportedPeriods: [...SHARED_AUTO_PERIODS],
  },
  {
    key: ShowcaseSection.TRUSTED_PARTNERS,
    label: 'Trusted Partners',
    entityType: ShowcaseEntityType.USER,
    rankingType: 'AUTO',
    description: 'Members with durable trust, low dispute rates, and strong delivery quality.',
    defaultPeriod: RankingPeriod.ALL_TIME,
    supportedPeriods: [...SHARED_AUTO_PERIODS],
  },
  {
    key: ShowcaseSection.FEATURED_MEMBERS,
    label: 'Featured Members',
    entityType: ShowcaseEntityType.USER,
    rankingType: 'ADMIN_CURATED',
    description: 'Admin-curated member highlights for community discovery.',
    defaultPeriod: RankingPeriod.ALL_TIME,
    supportedPeriods: [RankingPeriod.ALL_TIME],
  },
  {
    key: ShowcaseSection.FEATURED_WEBSITES,
    label: 'Featured Websites',
    entityType: ShowcaseEntityType.WEBSITE,
    rankingType: 'ADMIN_CURATED',
    description: 'Admin-curated featured websites with controlled backlink visibility.',
    defaultPeriod: RankingPeriod.ALL_TIME,
    supportedPeriods: [RankingPeriod.ALL_TIME],
  },
  {
    key: ShowcaseSection.MOST_SUCCESSFUL_WEBSITES,
    label: 'Most Successful Websites',
    entityType: ShowcaseEntityType.WEBSITE,
    rankingType: 'AUTO',
    description: 'Websites performing strongly across verified placements and sustained quality.',
    defaultPeriod: RankingPeriod.ALL_TIME,
    supportedPeriods: [...SHARED_AUTO_PERIODS],
  },
  {
    key: ShowcaseSection.HIGHEST_RATED_PROVIDERS,
    label: 'Highest Rated Providers',
    entityType: ShowcaseEntityType.USER,
    rankingType: 'AUTO',
    description: 'Providers with strong quality signals and dependable outcomes.',
    defaultPeriod: RankingPeriod.ALL_TIME,
    supportedPeriods: [...SHARED_AUTO_PERIODS],
  },
  {
    key: ShowcaseSection.RISING_STARS,
    label: 'Rising Stars',
    entityType: ShowcaseEntityType.USER,
    rankingType: 'AUTO',
    description: 'Members gaining momentum with strong recent performance.',
    defaultPeriod: RankingPeriod.ALL_TIME,
    supportedPeriods: [...SHARED_AUTO_PERIODS],
  },
  {
    key: ShowcaseSection.TOP_PERFORMERS_WEEK,
    label: 'Top Performers This Week',
    entityType: ShowcaseEntityType.USER,
    rankingType: 'AUTO',
    description: 'Weekly leaderboard for recent approved contribution and quality.',
    defaultPeriod: RankingPeriod.THIS_WEEK,
    supportedPeriods: [RankingPeriod.THIS_WEEK],
  },
  {
    key: ShowcaseSection.TOP_PERFORMERS_MONTH,
    label: 'Top Performers This Month',
    entityType: ShowcaseEntityType.USER,
    rankingType: 'AUTO',
    description: 'Monthly leaderboard for recent approved contribution and quality.',
    defaultPeriod: RankingPeriod.THIS_MONTH,
    supportedPeriods: [RankingPeriod.THIS_MONTH],
  },
  {
    key: ShowcaseSection.ADMIN_FEATURED_MEMBERS,
    label: 'Admin Featured Members',
    entityType: ShowcaseEntityType.USER,
    rankingType: 'ADMIN_CURATED',
    description: 'Institutionally featured member profiles curated by admins.',
    defaultPeriod: RankingPeriod.ALL_TIME,
    supportedPeriods: [RankingPeriod.ALL_TIME],
  },
];

const SECTION_MAP = new Map(
  COMMUNITY_SHOWCASE_SECTIONS.map((item) => [item.key, item]),
);

export const AUTO_RANKING_SECTIONS = new Set(
  COMMUNITY_SHOWCASE_SECTIONS.filter((item) => item.rankingType === 'AUTO').map(
    (item) => item.key,
  ),
);

export const ADMIN_CURATED_SECTIONS = new Set(
  COMMUNITY_SHOWCASE_SECTIONS.filter(
    (item) => item.rankingType === 'ADMIN_CURATED',
  ).map((item) => item.key),
);

export function getShowcaseSectionConfig(section: ShowcaseSection) {
  return SECTION_MAP.get(section) ?? null;
}

export function isAutoShowcaseSection(section: ShowcaseSection) {
  return AUTO_RANKING_SECTIONS.has(section);
}

export function isAdminCuratedShowcaseSection(section: ShowcaseSection) {
  return ADMIN_CURATED_SECTIONS.has(section);
}

export function getDefaultPeriodForShowcaseSection(section: ShowcaseSection) {
  return getShowcaseSectionConfig(section)?.defaultPeriod ?? RankingPeriod.ALL_TIME;
}

export function getSupportedPeriodsForShowcaseSection(section: ShowcaseSection) {
  return getShowcaseSectionConfig(section)?.supportedPeriods ?? [RankingPeriod.ALL_TIME];
}

export function isShowcaseSectionEntityTypeCompatible(
  section: ShowcaseSection,
  entityType: ShowcaseEntityType,
) {
  return getShowcaseSectionConfig(section)?.entityType === entityType;
}
