import { Injectable } from '@nestjs/common';
import {
  BadgeCategory,
  Prisma,
  RankingPeriod,
  RewardBenefitStatus,
  ShowcaseEntityType,
  ShowcaseSection,
  UserBadgeStatus,
  UserRole,
  UserStatus,
  WebsiteMarketplaceVisibilityStatus,
  WebsiteVerificationStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { getPeriodDateRange, normalizeDomainLike } from '../community-showcase.utils';

@Injectable()
export class CommunityRankingService {
  constructor(private readonly prisma: PrismaService) {}

  async buildRankings(input: {
    section: ShowcaseSection;
    period: RankingPeriod;
    entityType: ShowcaseEntityType;
    limit?: number;
  }) {
    const limit = Math.max(1, Math.min(200, input.limit ?? 100));

    if (input.entityType === ShowcaseEntityType.USER) {
      return this.buildUserRankings(input.section, input.period, limit);
    }

    return this.buildWebsiteRankings(input.section, input.period, limit);
  }

  private async buildUserRankings(
    section: ShowcaseSection,
    period: RankingPeriod,
    limit: number,
  ) {
    const take = Math.max(Math.min(limit * 4, 200), 100);

    const rows = await this.prisma.userShowcaseStats.findMany({
      where: {
        user: {
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          isDeleted: false,
        },
      },
      take,
      orderBy: this.getUserCandidateOrder(section),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            country: true,
            imageKey: true,
            imageUrl: true,
            isVerified: true,
            publisher: {
              select: {
                nicheSpecialization: true,
                bio: true,
                tags: true,
              },
            },
            websites: {
              where: {
                isDeleted: false,
                isFlag: false,
              },
              orderBy: [{ verifiedAt: 'desc' }, { createdAt: 'asc' }],
              take: 3,
              select: {
                id: true,
                name: true,
                websiteUrl: true,
                rootDomain: true,
                industry: true,
                country: true,
                logoKey: true,
                tagline: true,
                verificationStatus: true,
                marketplaceVisibilityStatus: true,
              },
            },
            badges: {
              where: {
                status: { in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE] },
              },
              select: {
                status: true,
                badge: {
                  select: {
                    code: true,
                    name: true,
                    category: true,
                    isPersistent: true,
                  },
                },
              },
            },
            rewardBenefits: {
              where: {
                status: RewardBenefitStatus.ACTIVE,
              },
              select: {
                rewardCode: true,
                rewardType: true,
              },
            },
          },
        },
      },
    });

    const items = rows
      .map((row) => this.mapUserRankingItem(row, section, period))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return items;
  }

  private async buildWebsiteRankings(
    section: ShowcaseSection,
    period: RankingPeriod,
    limit: number,
  ) {
    const take = Math.max(Math.min(limit * 4, 200), 100);

    const rows = await this.prisma.websiteShowcaseStats.findMany({
      where: {
        website: {
          isDeleted: false,
          isFlag: false,
          marketplaceVisibilityStatus: {
            not: WebsiteMarketplaceVisibilityStatus.HIDDEN,
          },
        },
      },
      take,
      orderBy: this.getWebsiteCandidateOrder(section),
      include: {
        website: {
          select: {
            id: true,
            name: true,
            websiteUrl: true,
            rootDomain: true,
            industry: true,
            country: true,
            logoKey: true,
            tagline: true,
            description: true,
            verificationStatus: true,
            marketplaceVisibilityStatus: true,
            author: {
              select: {
                id: true,
                name: true,
                country: true,
                imageKey: true,
                imageUrl: true,
                isVerified: true,
                badges: {
                  where: {
                    status: { in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE] },
                  },
                  select: {
                    badge: {
                      select: {
                        code: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
                rewardProfile: {
                  select: {
                    earnedBadgeCount: true,
                    activeRewardCount: true,
                    providerApprovedTasks: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const items = rows
      .map((row) => this.mapWebsiteRankingItem(row, section, period))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return items;
  }

  private mapUserRankingItem(
    row: Prisma.UserShowcaseStatsGetPayload<{
      include: {
        user: {
          select: {
            id: true;
            name: true;
            country: true;
            imageKey: true;
            imageUrl: true;
            isVerified: true;
            publisher: {
              select: {
                nicheSpecialization: true;
                bio: true;
                tags: true;
              };
            };
            websites: {
              select: {
                id: true;
                name: true;
                websiteUrl: true;
                rootDomain: true;
                industry: true;
                country: true;
                logoKey: true;
                tagline: true;
                verificationStatus: true;
                marketplaceVisibilityStatus: true;
              };
            };
            badges: {
              select: {
                status: true;
                badge: {
                  select: {
                    code: true;
                    name: true;
                    category: true;
                    isPersistent: true;
                  };
                };
              };
            };
            rewardBenefits: {
              select: {
                rewardCode: true;
                rewardType: true;
              };
            };
          };
        };
      };
    }>,
    section: ShowcaseSection,
    period: RankingPeriod,
  ) {
    const user = row.user;
    const primaryWebsite = user.websites[0] ?? null;
    const publicBadges = user.badges.map((item) => ({
      code: item.badge.code,
      name: item.badge.name,
      category: item.badge.category,
      status: item.status,
    }));
    const achievements = publicBadges.filter((item) =>
      item.category === BadgeCategory.KICKSTARTER || item.category === BadgeCategory.HALL_OF_FAME,
    );
    const supportPriorityActive = user.rewardBenefits.some(
      (item) => item.rewardCode === 'SUPPORT_PRIORITY',
    );
    const trustedPartnerBadge = publicBadges.some(
      (item) => item.code === 'TRUSTED_PARTNER',
    );
    const approvalRate = row.approvalRate;
    const disputeRate = row.disputeRate;
    const periodVolume = this.getUserPeriodVolume(row, period);

    let score = 0;
    switch (section) {
      case ShowcaseSection.TOP_CONTRIBUTORS:
        score =
          row.approvedTasks * 5 +
          approvalRate * 2 +
          row.activeBadgeCount * 10 +
          row.hallOfFameCount * 25 +
          periodVolume * 6 -
          disputeRate * 4;
        break;
      case ShowcaseSection.TRUSTED_PARTNERS:
        score =
          approvalRate * 3 +
          row.approvedTasks * 2 +
          Math.max(0, 100 - disputeRate * 10) +
          row.permanentBadgeCount * 5 +
          (trustedPartnerBadge ? 40 : 0) +
          (supportPriorityActive ? 15 : 0);
        break;
      case ShowcaseSection.HIGHEST_RATED_PROVIDERS:
        score = approvalRate * 3 + row.approvedTasks * 2 - disputeRate * 3;
        break;
      case ShowcaseSection.RISING_STARS:
        score =
          row.monthlyApprovedTasks * 8 +
          row.weeklyApprovedTasks * 10 +
          approvalRate +
          row.activeBadgeCount * 4 -
          disputeRate * 3;
        break;
      case ShowcaseSection.TOP_PERFORMERS_WEEK:
        score = row.weeklyApprovedTasks * 10 + approvalRate * 1.5 - disputeRate * 3;
        break;
      case ShowcaseSection.TOP_PERFORMERS_MONTH:
        score =
          row.monthlyApprovedTasks * 8 +
          approvalRate * 1.5 +
          row.activeBadgeCount * 4 -
          disputeRate * 3;
        break;
      default:
        score = row.topContributorScore;
        break;
    }

    return {
      entityType: ShowcaseEntityType.USER,
      entityId: user.id,
      score: this.round(score),
      metrics: {
        approvedTasks: row.approvedTasks,
        approvalRate: row.approvalRate,
        disputeRate: row.disputeRate,
        revisionRate: row.revisionRate,
        activeBadgeCount: row.activeBadgeCount,
        permanentBadgeCount: row.permanentBadgeCount,
        hallOfFameCount: row.hallOfFameCount,
        weeklyApprovedTasks: row.weeklyApprovedTasks,
        monthlyApprovedTasks: row.monthlyApprovedTasks,
      },
      displayData: {
        entityType: ShowcaseEntityType.USER,
        displayName: user.name,
        subtitle: this.getUserSubtitle(section, user.name, user.publisher?.nicheSpecialization, primaryWebsite?.industry, trustedPartnerBadge),
        description: user.publisher?.bio ?? null,
        profileImageKey: user.imageKey ?? null,
        legacyProfileImageUrl: user.imageUrl ?? null,
        country: user.country ?? primaryWebsite?.country ?? null,
        niche: user.publisher?.nicheSpecialization ?? primaryWebsite?.industry ?? null,
        badges: publicBadges,
        achievements,
        stats: {
          approvedTasks: row.approvedTasks,
          approvalRate: row.approvalRate,
          disputeRate: row.disputeRate,
          revisionRate: row.revisionRate,
          weeklyApprovedTasks: row.weeklyApprovedTasks,
          monthlyApprovedTasks: row.monthlyApprovedTasks,
        },
        primaryWebsite: primaryWebsite
          ? {
              id: primaryWebsite.id,
              name: primaryWebsite.name,
              websiteUrl: primaryWebsite.websiteUrl,
              rootDomain:
                primaryWebsite.rootDomain ?? normalizeDomainLike(primaryWebsite.websiteUrl),
              industry: primaryWebsite.industry,
              country: primaryWebsite.country,
              logoKey: primaryWebsite.logoKey ?? null,
              tagline: primaryWebsite.tagline ?? null,
            }
          : null,
        profileUrl: `/community/members/${user.id}`,
        websiteUrl: null,
        externalLink: null,
        linkType: null,
        isFeatured: false,
        section,
      },
    };
  }

  private mapWebsiteRankingItem(
    row: Prisma.WebsiteShowcaseStatsGetPayload<{
      include: {
        website: {
          select: {
            id: true;
            name: true;
            websiteUrl: true;
            rootDomain: true;
            industry: true;
            country: true;
            logoKey: true;
            tagline: true;
            description: true;
            verificationStatus: true;
            marketplaceVisibilityStatus: true;
            author: {
              select: {
                id: true;
                name: true;
                country: true;
                imageKey: true;
                imageUrl: true;
                isVerified: true;
                badges: {
                  select: {
                    badge: {
                      select: {
                        code: true;
                        name: true;
                        category: true;
                      };
                    };
                  };
                };
                rewardProfile: {
                  select: {
                    earnedBadgeCount: true;
                    activeRewardCount: true;
                    providerApprovedTasks: true;
                  };
                };
              };
            };
          };
        };
      };
    }>,
    section: ShowcaseSection,
    period: RankingPeriod,
  ) {
    const website = row.website;
    const owner = website.author;
    const ownerBadges = owner.badges.map((item) => item.badge);
    const ownerHallOfFameCount = ownerBadges.filter(
      (item) => item.category === BadgeCategory.HALL_OF_FAME,
    ).length;
    const periodPlacements = this.getWebsitePeriodVolume(row, period);
    const verificationBonus =
      website.verificationStatus === WebsiteVerificationStatus.VERIFIED ? 25 : 0;
    const visibilityPenalty =
      website.marketplaceVisibilityStatus === WebsiteMarketplaceVisibilityStatus.HIDDEN
        ? 20
        : 0;

    let score = row.successfulWebsiteScore;
    if (section === ShowcaseSection.MOST_SUCCESSFUL_WEBSITES) {
      score =
        row.approvedPlacements * 6 +
        periodPlacements * 6 +
        row.approvalRate +
        (owner.rewardProfile?.providerApprovedTasks ?? 0) * 0.5 +
        ownerHallOfFameCount * 10 +
        verificationBonus -
        row.disputeRate * 4 -
        visibilityPenalty;
    }

    return {
      entityType: ShowcaseEntityType.WEBSITE,
      entityId: website.id,
      score: this.round(score),
      metrics: {
        approvedPlacements: row.approvedPlacements,
        approvalRate: row.approvalRate,
        disputeRate: row.disputeRate,
        weeklyPlacements: row.weeklyPlacements,
        monthlyPlacements: row.monthlyPlacements,
      },
      displayData: {
        entityType: ShowcaseEntityType.WEBSITE,
        displayName: website.name,
        subtitle: website.tagline ?? `${website.industry} website`,
        description: website.description ?? null,
        profileImageKey: website.logoKey ?? null,
        legacyProfileImageUrl: null,
        country: website.country,
        niche: website.industry,
        badges: ownerBadges,
        achievements: ownerBadges.filter((item) =>
          item.category === BadgeCategory.KICKSTARTER || item.category === BadgeCategory.HALL_OF_FAME,
        ),
        stats: {
          approvedPlacements: row.approvedPlacements,
          approvalRate: row.approvalRate,
          disputeRate: row.disputeRate,
          weeklyPlacements: row.weeklyPlacements,
          monthlyPlacements: row.monthlyPlacements,
        },
        primaryWebsite: null,
        owner: {
          id: owner.id,
          name: owner.name,
          country: owner.country ?? null,
          imageKey: owner.imageKey ?? null,
          legacyImageUrl: owner.imageUrl ?? null,
          isVerified: owner.isVerified,
        },
        profileUrl: `/community/websites/${website.id}`,
        websiteUrl: website.websiteUrl,
        externalLink: null,
        linkType: null,
        isFeatured: false,
        section,
        rootDomain: website.rootDomain ?? normalizeDomainLike(website.websiteUrl),
      },
    };
  }

  private getUserCandidateOrder(section: ShowcaseSection): Prisma.UserShowcaseStatsOrderByWithRelationInput[] {
    switch (section) {
      case ShowcaseSection.TRUSTED_PARTNERS:
        return [{ trustedPartnerScore: 'desc' }, { approvalRate: 'desc' }];
      case ShowcaseSection.RISING_STARS:
        return [{ risingStarScore: 'desc' }, { monthlyApprovedTasks: 'desc' }];
      case ShowcaseSection.TOP_PERFORMERS_WEEK:
        return [{ weeklyApprovedTasks: 'desc' }, { approvalRate: 'desc' }];
      case ShowcaseSection.TOP_PERFORMERS_MONTH:
        return [{ monthlyApprovedTasks: 'desc' }, { approvalRate: 'desc' }];
      case ShowcaseSection.HIGHEST_RATED_PROVIDERS:
        return [{ approvalRate: 'desc' }, { approvedTasks: 'desc' }];
      case ShowcaseSection.TOP_CONTRIBUTORS:
      default:
        return [{ topContributorScore: 'desc' }, { approvedTasks: 'desc' }];
    }
  }

  private getWebsiteCandidateOrder(section: ShowcaseSection): Prisma.WebsiteShowcaseStatsOrderByWithRelationInput[] {
    switch (section) {
      case ShowcaseSection.MOST_SUCCESSFUL_WEBSITES:
      default:
        return [{ successfulWebsiteScore: 'desc' }, { approvedPlacements: 'desc' }];
    }
  }

  private getUserPeriodVolume(
    row: {
      approvedTasks: number;
      weeklyApprovedTasks: number;
      monthlyApprovedTasks: number;
    },
    period: RankingPeriod,
  ) {
    switch (period) {
      case RankingPeriod.THIS_WEEK:
        return row.weeklyApprovedTasks;
      case RankingPeriod.THIS_MONTH:
      case RankingPeriod.LAST_30_DAYS:
        return row.monthlyApprovedTasks;
      default:
        return row.approvedTasks;
    }
  }

  private getWebsitePeriodVolume(
    row: {
      approvedPlacements: number;
      weeklyPlacements: number;
      monthlyPlacements: number;
    },
    period: RankingPeriod,
  ) {
    switch (period) {
      case RankingPeriod.THIS_WEEK:
        return row.weeklyPlacements;
      case RankingPeriod.THIS_MONTH:
      case RankingPeriod.LAST_30_DAYS:
        return row.monthlyPlacements;
      default:
        return row.approvedPlacements;
    }
  }

  private getUserSubtitle(
    section: ShowcaseSection,
    userName: string,
    publisherNiche?: string | null,
    websiteIndustry?: string | null,
    trustedPartnerBadge?: boolean,
  ) {
    if (section === ShowcaseSection.TRUSTED_PARTNERS || trustedPartnerBadge) {
      return 'Trusted SEO Partner';
    }

    if (section === ShowcaseSection.TOP_CONTRIBUTORS) {
      return 'Top SEO Contributor';
    }

    if (section === ShowcaseSection.RISING_STARS) {
      return 'Rising Marketplace Member';
    }

    if (publisherNiche) {
      return publisherNiche;
    }

    if (websiteIndustry) {
      return `${websiteIndustry} Publisher`;
    }

    return `${userName} Community Member`;
  }

  private round(value: number) {
    return Number(value.toFixed(2));
  }
}
