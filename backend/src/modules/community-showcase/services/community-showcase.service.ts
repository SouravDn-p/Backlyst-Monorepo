import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BadgeCategory,
  RankingPeriod,
  RewardBenefitStatus,
  ShowcaseEntityType,
  ShowcaseLinkType,
  ShowcaseSection,
  UserBadgeStatus,
  UserRole,
  UserStatus,
  VerifiedPlacementStatus,
  WebsiteMarketplaceVisibilityStatus,
} from '@prisma/client';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  COMMUNITY_SHOWCASE_SECTIONS,
  getDefaultPeriodForShowcaseSection,
  getShowcaseSectionConfig,
  getSupportedPeriodsForShowcaseSection,
  isAdminCuratedShowcaseSection,
  isShowcaseSectionEntityTypeCompatible,
} from '../community-showcase.constants';
import { CommunityShowcaseQueryDto } from '../dto';
import { normalizeDomainLike, normalizePagination } from '../community-showcase.utils';
import { CommunityRankingSnapshotService } from './community-ranking-snapshot.service';

@Injectable()
export class CommunityShowcaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: AwsS3Service,
    private readonly communityRankingSnapshotService: CommunityRankingSnapshotService,
  ) {}

  getSections() {
    return sendResponse('Community showcase sections fetched successfully.', {
      sections: COMMUNITY_SHOWCASE_SECTIONS.map((item) => ({
        key: item.key,
        label: item.label,
        entityType: item.entityType,
        rankingType: item.rankingType,
        description: item.description,
      })),
    });
  }

  async getShowcase(query: CommunityShowcaseQueryDto) {
    const config = getShowcaseSectionConfig(query.section);
    if (!config) {
      throw new BadRequestException('Unsupported showcase section.');
    }

    const entityType = query.entityType ?? config.entityType;
    if (!isShowcaseSectionEntityTypeCompatible(config.key, entityType)) {
      throw new BadRequestException('Section and entityType are not compatible.');
    }

    const period = query.period ?? getDefaultPeriodForShowcaseSection(config.key);
    if (!getSupportedPeriodsForShowcaseSection(config.key).includes(period)) {
      throw new BadRequestException('Requested period is not supported for this section.');
    }

    const { page, limit } = normalizePagination(query.page, query.limit, 50);

    if (isAdminCuratedShowcaseSection(config.key)) {
      const now = new Date();
      const entries = await this.prisma.communityShowcaseEntry.findMany({
        where: {
          section: config.key,
          entityType,
          isVisible: true,
          OR: [{ featuredFrom: null }, { featuredFrom: { lte: now } }],
          AND: [{ OR: [{ featuredUntil: null }, { featuredUntil: { gte: now } }] }],
        },
        orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: 200,
      });

      const hydrated = (await this.hydrateCuratedEntries(entries));
      const filtered = hydrated.filter((item: any) => this.matchesShowcaseFilters(item, query));
      const paged = filtered.slice((page - 1) * limit, page * limit);
      const items = await Promise.all(
        paged.map((item: any) => this.resolvePublicShowcaseItem(item)),
      );
      const hasMore = filtered.length > page * limit;

      return sendResponse('Community showcase fetched successfully.', {
        section: config.key,
        period,
        entityType,
        limit,
        items,
        hasMore,
        nextCursor: hasMore ? String(page + 1) : null,
        generatedAt: null,
        source: 'ADMIN_CURATED',
      });
    }

    const snapshot = await this.communityRankingSnapshotService.getLatestSnapshot(
      config.key,
      period,
      entityType,
    );

    if (!snapshot) {
      return sendResponse('Community showcase fetched successfully.', {
        section: config.key,
        period,
        entityType,
        limit,
        items: [],
        hasMore: false,
        nextCursor: null,
        generatedAt: null,
        source: 'SNAPSHOT',
      });
    }

    const filtered = snapshot.entries
      .map((entry) => ({
        rank: entry.rank,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metrics: this.toObject(entry.metrics),
        displayData: this.toObject(entry.displayData),
      }))
      .filter((item) => this.matchesShowcaseFilters(item, query));

    const paged = filtered.slice((page - 1) * limit, page * limit);
    const items = await Promise.all(
      paged.map((item: any) => this.resolvePublicShowcaseItem(item)),
    );
    const hasMore = filtered.length > page * limit;

    return sendResponse('Community showcase fetched successfully.', {
      section: config.key,
      period,
      entityType,
      limit,
      items,
      hasMore,
      nextCursor: hasMore ? String(page + 1) : null,
      generatedAt: snapshot.generatedAt,
      source: 'SNAPSHOT',
    });
  }

  async getPublicMemberProfile(identifier: string) {
    const user = await this.resolvePublicUser(identifier);

    const [rewardProfile, showcaseStats, badges, benefits, websites, rankingEntries] =
      await Promise.all([
        this.prisma.userRewardProfile.findUnique({ where: { userId: user.id } }),
        this.prisma.userShowcaseStats.findUnique({ where: { userId: user.id } }),
        this.prisma.userBadge.findMany({
          where: {
            userId: user.id,
            status: { in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE] },
          },
          include: {
            badge: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
                rewardImpactText: true,
                requirementText: true,
              },
            },
          },
          orderBy: [{ earnedAt: 'desc' }, { activatedAt: 'desc' }],
        }),
        this.prisma.userRewardBenefit.findMany({
          where: { userId: user.id, status: RewardBenefitStatus.ACTIVE },
          orderBy: { activatedAt: 'desc' },
          select: {
            id: true,
            rewardCode: true,
            rewardType: true,
            metadata: true,
            activatedAt: true,
            expiresAt: true,
          },
        }),
        this.prisma.website.findMany({
          where: {
            authorId: user.id,
            isDeleted: false,
            isFlag: false,
            marketplaceVisibilityStatus: {
              not: WebsiteMarketplaceVisibilityStatus.HIDDEN,
            },
          },
          include: {
            showcaseStats: true,
          },
          orderBy: [{ verifiedAt: 'desc' }, { createdAt: 'asc' }],
        }),
        this.prisma.communityRankingEntry.findMany({
          where: {
            entityType: ShowcaseEntityType.USER,
            entityId: user.id,
          },
          include: {
            snapshot: {
              select: {
                section: true,
                period: true,
                generatedAt: true,
              },
            },
          },
          orderBy: [{ snapshot: { generatedAt: 'desc' } }],
          take: 100,
        }),
      ]);

    const visibleWebsiteEntries = await this.getVisibleWebsiteEntryMap(
      websites.map((item) => item.id),
    );

    const groupedBadges = {
      recognition: badges.filter(
        (item) =>
          item.badge.category !== BadgeCategory.KICKSTARTER &&
          item.badge.category !== BadgeCategory.HALL_OF_FAME,
      ),
      kickstarter: badges.filter(
        (item) => item.badge.category === BadgeCategory.KICKSTARTER,
      ),
      hallOfFame: badges.filter(
        (item) => item.badge.category === BadgeCategory.HALL_OF_FAME,
      ),
    };

    const rankingPositions = this.reduceLatestRankingPositions(rankingEntries);

    const websiteItems = await Promise.all(
      websites.map(async (website) => ({
        id: website.id,
        name: website.name,
        websiteUrl: null,
        domain: website.rootDomain ?? normalizeDomainLike(website.websiteUrl),
        industry: website.industry,
        country: website.country,
        tagline: website.tagline ?? null,
        logoUrl: await this.s3.resolveFileUrl(website.logoKey ?? null),
        profileUrl: `/community/websites/${website.id}`,
        stats: website.showcaseStats
          ? {
              approvedPlacements: website.showcaseStats.approvedPlacements,
              approvalRate: website.showcaseStats.approvalRate,
              disputeRate: website.showcaseStats.disputeRate,
              weeklyPlacements: website.showcaseStats.weeklyPlacements,
              monthlyPlacements: website.showcaseStats.monthlyPlacements,
            }
          : null,
        externalLink: this.buildExternalLink(
          website.websiteUrl,
          visibleWebsiteEntries.get(website.id)?.linkType ?? null,
          Boolean(visibleWebsiteEntries.get(website.id)?.showExternalLink),
        ),
      })),
    );

    return sendResponse('Community member profile fetched successfully.', {
      member: {
        id: user.id,
        displayName: user.name,
        country: user.country ?? null,
        companyName: user.companyName ?? null,
        businessType: user.businessType ?? null,
        profileImage: await this.s3.resolveFileUrl(user.imageKey ?? user.imageUrl),
        bio: user.publisher?.bio ?? null,
        niche: user.publisher?.nicheSpecialization ?? null,
        tags: user.publisher?.tags ?? [],
        profileUrl: `/community/members/${user.id}`,
      },
      badges: {
        recognition: groupedBadges.recognition.map((item) => this.toPublicBadge(item)),
        kickstarter: groupedBadges.kickstarter.map((item) => this.toPublicBadge(item)),
        hallOfFame: groupedBadges.hallOfFame.map((item) => this.toPublicBadge(item)),
        activeRecognition: groupedBadges.recognition
          .filter((item) => item.status === UserBadgeStatus.ACTIVE)
          .map((item) => this.toPublicBadge(item)),
      },
      achievements: [
        ...groupedBadges.kickstarter.map((item) => this.toPublicBadge(item)),
        ...groupedBadges.hallOfFame.map((item) => this.toPublicBadge(item)),
      ],
      stats: {
        rewardProfile,
        showcaseStats,
      },
      websites: websiteItems,
      rankingPositions,
      activeBenefits: benefits,
    });
  }
  async getPublicWebsiteProfile(identifier: string) {
    const website: any = await this.resolvePublicWebsite(identifier);

    const [visibleEntry, rankingEntries, approvedPlacementsCount] = await Promise.all([
      this.getVisibleWebsiteEntryMap([website.id]).then((map) => map.get(website.id) ?? null),
      this.prisma.communityRankingEntry.findMany({
        where: {
          entityType: ShowcaseEntityType.WEBSITE,
          entityId: website.id,
        },
        include: {
          snapshot: {
            select: {
              section: true,
              period: true,
              generatedAt: true,
            },
          },
        },
        orderBy: [{ snapshot: { generatedAt: 'desc' } }],
        take: 100,
      }),
      this.prisma.websiteVerifiedPlacement.count({
        where: {
          websiteId: website.id,
          status: VerifiedPlacementStatus.VERIFIED,
        },
      }),
    ]);

    return sendResponse('Community website profile fetched successfully.', {
      website: {
        id: website.id,
        name: website.name,
        domain: website.rootDomain ?? normalizeDomainLike(website.websiteUrl),
        websiteUrl: null,
        niche: website.industry,
        country: website.country,
        tagline: website.tagline ?? null,
        description: website.description ?? null,
        logoUrl: await this.s3.resolveFileUrl(website.logoKey ?? null),
        verificationStatus: website.verificationStatus,
        approvedPlacementsCount,
        stats: website.showcaseStats,
        externalLink: this.buildExternalLink(
          website.websiteUrl,
          visibleEntry?.linkType ?? null,
          Boolean(visibleEntry?.showExternalLink),
        ),
        profileUrl: `/community/websites/${website.id}`,
      },
      owner: {
        id: website.author.id,
        displayName: website.author.name,
        country: website.author.country ?? null,
        profileImage: await this.s3.resolveFileUrl(
          website.author.imageKey ?? website.author.imageUrl,
        ),
        niche: website.author.publisher?.nicheSpecialization ?? null,
      },
      ownerBadges: website.author.badges.map((item) => this.toPublicBadge(item)),
      rankingPositions: this.reduceLatestRankingPositions(rankingEntries),
    });
  }

  private async hydrateCuratedEntries(entries: any[]) {
    const userIds = entries
      .filter((entry) => entry.entityType === ShowcaseEntityType.USER)
      .map((entry) => entry.entityId);
    const websiteIds = entries
      .filter((entry) => entry.entityType === ShowcaseEntityType.WEBSITE)
      .map((entry) => entry.entityId);

    const [users, websites] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({
            where: {
              id: { in: userIds },
              role: UserRole.USER,
              status: UserStatus.ACTIVE,
              isDeleted: false,
            },
            select: {
              id: true,
              name: true,
              country: true,
              imageKey: true,
              imageUrl: true,
              publisher: {
                select: {
                  nicheSpecialization: true,
                  bio: true,
                },
              },
              websites: {
                where: {
                  isDeleted: false,
                  isFlag: false,
                  marketplaceVisibilityStatus: {
                    not: WebsiteMarketplaceVisibilityStatus.HIDDEN,
                  },
                },
                orderBy: [{ verifiedAt: 'desc' }, { createdAt: 'asc' }],
                take: 1,
                select: {
                  id: true,
                  name: true,
                  websiteUrl: true,
                  rootDomain: true,
                  industry: true,
                  country: true,
                  logoKey: true,
                  tagline: true,
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
                    },
                  },
                },
              },
              showcaseStats: true,
            },
          })
        : Promise.resolve([] as any[]),
      websiteIds.length
        ? this.prisma.website.findMany({
            where: {
              id: { in: websiteIds },
              isDeleted: false,
              isFlag: false,
              marketplaceVisibilityStatus: {
                not: WebsiteMarketplaceVisibilityStatus.HIDDEN,
              },
            },
            include: {
              showcaseStats: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  country: true,
                  imageKey: true,
                  imageUrl: true,
                  publisher: {
                    select: {
                      nicheSpecialization: true,
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
                        },
                      },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([] as any[]),
    ]);

    const userMap = new Map<string, any>(
      users.map((item: any) => [item.id, item] as [string, any]),
    );
    const websiteMap = new Map<string, any>(
      websites.map((item: any) => [item.id, item] as [string, any]),
    );

    return (entries).flatMap<any>((entry: any, index: number): any[] => {
      if (entry.entityType === ShowcaseEntityType.USER) {
        const user = userMap.get(entry.entityId);
        if (!user) {
          return [];
        }

        const primaryWebsite = user.websites[0] ?? null;
        return [
          {
            rank: index + 1,
            entityType: ShowcaseEntityType.USER,
            entityId: user.id,
            metrics: user.showcaseStats
              ? {
                  approvedTasks: user.showcaseStats.approvedTasks,
                  approvalRate: user.showcaseStats.approvalRate,
                  disputeRate: user.showcaseStats.disputeRate,
                  revisionRate: user.showcaseStats.revisionRate,
                }
              : {},
            displayData: {
              displayName: entry.title ?? user.name,
              subtitle:
                entry.subtitle ??
                user.publisher?.nicheSpecialization ??
                primaryWebsite?.industry ??
                'Featured member',
              description: entry.description ?? user.publisher?.bio ?? null,
              profileImageKey: user.imageKey ?? null,
              legacyProfileImageUrl: user.imageUrl ?? null,
              country: user.country ?? primaryWebsite?.country ?? null,
              niche:
                user.publisher?.nicheSpecialization ?? primaryWebsite?.industry ?? null,
              badges: user.badges.map((item) => ({
                code: item.badge.code,
                name: item.badge.name,
                category: item.badge.category,
              })),
              achievements: user.badges
                .filter(
                  (item) =>
                    item.badge.category === BadgeCategory.KICKSTARTER ||
                    item.badge.category === BadgeCategory.HALL_OF_FAME,
                )
                .map((item) => ({
                  code: item.badge.code,
                  name: item.badge.name,
                  category: item.badge.category,
                })),
              stats: user.showcaseStats
                ? {
                    approvedTasks: user.showcaseStats.approvedTasks,
                    approvalRate: user.showcaseStats.approvalRate,
                    disputeRate: user.showcaseStats.disputeRate,
                    revisionRate: user.showcaseStats.revisionRate,
                  }
                : {},
              primaryWebsite: primaryWebsite
                ? {
                    id: primaryWebsite.id,
                    name: primaryWebsite.name,
                    websiteUrl: primaryWebsite.websiteUrl,
                    rootDomain:
                      primaryWebsite.rootDomain ??
                      normalizeDomainLike(primaryWebsite.websiteUrl),
                    industry: primaryWebsite.industry,
                    country: primaryWebsite.country,
                    logoKey: primaryWebsite.logoKey ?? null,
                    tagline: primaryWebsite.tagline ?? null,
                  }
                : null,
              profileUrl: `/community/members/${user.id}`,
              websiteUrl: null,
              externalLink:
                entry.showExternalLink && primaryWebsite
                  ? {
                      url: primaryWebsite.websiteUrl,
                    }
                  : null,
              linkType: entry.linkType ?? null,
              isFeatured: entry.isFeatured,
              section: entry.section,
            },
          },
        ];
      }

      const website = websiteMap.get(entry.entityId);
      if (!website) {
        return [];
      }

      return [
        {
          rank: index + 1,
          entityType: ShowcaseEntityType.WEBSITE,
          entityId: website.id,
          metrics: website.showcaseStats
            ? {
                approvedPlacements: website.showcaseStats.approvedPlacements,
                approvalRate: website.showcaseStats.approvalRate,
                disputeRate: website.showcaseStats.disputeRate,
                weeklyPlacements: website.showcaseStats.weeklyPlacements,
                monthlyPlacements: website.showcaseStats.monthlyPlacements,
              }
            : {},
          displayData: {
            displayName: entry.title ?? website.name,
            subtitle: entry.subtitle ?? website.tagline ?? website.industry,
            description: entry.description ?? website.description ?? null,
            profileImageKey: website.logoKey ?? null,
            legacyProfileImageUrl: null,
            country: website.country,
            niche: website.industry,
            badges: website.author.badges.map((item) => ({
              code: item.badge.code,
              name: item.badge.name,
              category: item.badge.category,
            })),
            achievements: website.author.badges
              .filter(
                (item) =>
                  item.badge.category === BadgeCategory.KICKSTARTER ||
                  item.badge.category === BadgeCategory.HALL_OF_FAME,
              )
              .map((item) => ({
                code: item.badge.code,
                name: item.badge.name,
                category: item.badge.category,
              })),
            stats: website.showcaseStats
              ? {
                  approvedPlacements: website.showcaseStats.approvedPlacements,
                  approvalRate: website.showcaseStats.approvalRate,
                  disputeRate: website.showcaseStats.disputeRate,
                  weeklyPlacements: website.showcaseStats.weeklyPlacements,
                  monthlyPlacements: website.showcaseStats.monthlyPlacements,
                }
              : {},
            primaryWebsite: null,
            owner: {
              id: website.author.id,
              name: website.author.name,
              country: website.author.country ?? null,
              imageKey: website.author.imageKey ?? null,
              legacyImageUrl: website.author.imageUrl ?? null,
              niche: website.author.publisher?.nicheSpecialization ?? null,
            },
            profileUrl: `/community/websites/${website.id}`,
            websiteUrl: website.websiteUrl,
            externalLink: entry.showExternalLink ? { url: website.websiteUrl } : null,
            linkType: entry.linkType ?? null,
            isFeatured: entry.isFeatured,
            section: entry.section,
            rootDomain: website.rootDomain ?? normalizeDomainLike(website.websiteUrl),
          },
        },
      ];
    });
  }

  private async resolvePublicShowcaseItem(item: {
    rank: number;
    entityType: ShowcaseEntityType;
    entityId: string;
    displayData: Record<string, any>;
    metrics: Record<string, any>;
  }) {
    const display = item.displayData ?? {};
    const primaryWebsite = display.primaryWebsite
      ? {
          ...display.primaryWebsite,
          logoUrl: await this.s3.resolveFileUrl(display.primaryWebsite.logoKey ?? null),
        }
      : null;

    const profileImage = await this.s3.resolveFileUrl(
      display.profileImageKey ?? display.legacyProfileImageUrl ?? null,
    );

    const externalLink = this.buildExternalLink(
      display.externalLink?.url ?? display.websiteUrl ?? null,
      display.linkType ?? null,
      Boolean(display.externalLink?.url),
    );

    return {
      rank: item.rank,
      entityType: item.entityType,
      entityId: item.entityId,
      displayName: display.displayName ?? 'Unknown',
      subtitle: display.subtitle ?? null,
      profileImage,
      badges: display.badges ?? [],
      achievements: display.achievements ?? [],
      stats: display.stats ?? item.metrics ?? {},
      primaryWebsite,
      profileUrl:
        display.profileUrl ??
        (item.entityType === ShowcaseEntityType.USER
          ? `/community/members/${item.entityId}`
          : `/community/websites/${item.entityId}`),
      websiteUrl: null,
      externalLink,
      linkType: externalLink?.linkType ?? null,
      isFeatured: Boolean(display.isFeatured),
      section: display.section ?? null,
    };
  }

  private matchesShowcaseFilters(
    item: { displayData?: Record<string, any> },
    query: CommunityShowcaseQueryDto,
  ) {
    const display = item.displayData ?? {};
    const search = query.search?.toLowerCase();
    const niche = query.niche?.toLowerCase();
    const country = query.country?.toLowerCase();
    const badge = query.badge?.toLowerCase();

    if (search) {
      const haystack = [
        display.displayName,
        display.subtitle,
        display.description,
        display.country,
        display.niche,
        display.primaryWebsite?.name,
        display.primaryWebsite?.rootDomain,
        display.owner?.name,
        display.rootDomain,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (niche) {
      const value = `${display.niche ?? ''}`.toLowerCase();
      if (!value.includes(niche)) {
        return false;
      }
    }

    if (country) {
      const value = `${display.country ?? display.primaryWebsite?.country ?? ''}`.toLowerCase();
      if (!value.includes(country)) {
        return false;
      }
    }

    if (badge) {
      const matched = [...(display.badges ?? []), ...(display.achievements ?? [])].some(
        (item) => `${item.code ?? ''} ${item.name ?? ''}`.toLowerCase().includes(badge),
      );

      if (!matched) {
        return false;
      }
    }

    return true;
  }

  // TODO(phase-5): replace user-id fallback with real public member slugs when the user schema supports them.
  private async resolvePublicUser(identifier: string) {
    const trimmed = identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isDeleted: false,
        id: trimmed,
      },
      select: {
        id: true,
        name: true,
        country: true,
        companyName: true,
        businessType: true,
        imageKey: true,
        imageUrl: true,
        publisher: {
          select: {
            nicheSpecialization: true,
            bio: true,
            tags: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Community member not found.');
    }

    return user;
  }

  // TODO(phase-5): replace id/domain fallback with real public website slugs when the website schema supports them.
  private async resolvePublicWebsite(identifier: string) {
    const normalized = normalizeDomainLike(identifier);
    const website: any = await this.prisma.website.findFirst({
      where: {
        isDeleted: false,
        isFlag: false,
        marketplaceVisibilityStatus: {
          not: WebsiteMarketplaceVisibilityStatus.HIDDEN,
        },
        OR: [
          { id: identifier.trim() },
          ...(normalized
            ? [
                { rootDomain: normalized },
                { websiteUrl: { contains: normalized, mode: 'insensitive' as const } },
              ]
            : []),
        ],
      },
      include: {
        showcaseStats: true,
        author: {
          select: {
            id: true,
            name: true,
            country: true,
            imageKey: true,
            imageUrl: true,
            publisher: {
              select: {
                nicheSpecialization: true,
              },
            },
            badges: {
              where: {
                status: { in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE] },
              },
              include: {
                badge: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    category: true,
                    rewardImpactText: true,
                    requirementText: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!website) {
      throw new NotFoundException('Community website not found.');
    }

    return website;
  }

  private async getVisibleWebsiteEntryMap(websiteIds: string[]) {
    if (!websiteIds.length) {
      return new Map<string, any>();
    }

    const now = new Date();
    const entries = await this.prisma.communityShowcaseEntry.findMany({
      where: {
        entityType: ShowcaseEntityType.WEBSITE,
        entityId: { in: websiteIds },
        isVisible: true,
        showExternalLink: true,
        OR: [{ featuredFrom: null }, { featuredFrom: { lte: now } }],
        AND: [{ OR: [{ featuredUntil: null }, { featuredUntil: { gte: now } }] }],
      },
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return new Map(entries.map((entry) => [entry.entityId, entry]));
  }

  private reduceLatestRankingPositions(entries: Array<any>) {
    const map = new Map<string, any>();

    for (const entry of entries) {
      const key = `${entry.snapshot.section}:${entry.snapshot.period}`;
      if (!map.has(key)) {
        map.set(key, {
          section: entry.snapshot.section,
          period: entry.snapshot.period,
          rank: entry.rank,
          score: entry.score,
          generatedAt: entry.snapshot.generatedAt,
        });
      }
    }

    return Array.from(map.values());
  }

  private toPublicBadge(item: {
    status: UserBadgeStatus;
    badge: {
      id: string;
      code: string;
      name: string;
      category: BadgeCategory;
      rewardImpactText?: string | null;
      requirementText?: string | null;
    };
  }) {
    return {
      id: item.badge.id,
      code: item.badge.code,
      name: item.badge.name,
      category: item.badge.category,
      status: item.status,
      requirement: item.badge.requirementText ?? null,
      benefit: item.badge.rewardImpactText ?? null,
    };
  }

  private buildExternalLink(
    url?: string | null,
    linkType?: ShowcaseLinkType | null,
    allowed?: boolean,
  ) {
    if (!allowed || !url?.trim()) {
      return null;
    }

    const resolvedLinkType = linkType ?? ShowcaseLinkType.NOFOLLOW;
    return {
      url,
      rel: resolvedLinkType.toLowerCase(),
      linkType: resolvedLinkType,
    };
  }

  private toObject(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, any>;
  }
}
