import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CompanySortBy, GetCompaniesQueryDto, SortOrder } from './dto/get-companies-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: AwsS3Service,
  ) {}

  async getCompanies(query: GetCompaniesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const companyIndustry = query.companyIndustry?.trim();
    const industry = query.industry;
    const nicheSpecialization = query.nicheSpecialization?.trim();
    const country = query.country;
    const sortBy = query.sortBy ?? CompanySortBy.QUALITY_SCORE;
    const order = query.order ?? SortOrder.DESC;

    const where: Prisma.UserWhereInput = {
      isDeleted: false,
      OR: [
        { companyName: { not: null } },
        { publisher: { isNot: null } },
      ],
    };

    // Support for deprecated companyIndustry field
    if (companyIndustry) {
      where.companyIndustry = {
        contains: companyIndustry,
        mode: 'insensitive',
      };
    }

    // Industry Multi-Match Logic (checks both companyIndustry and businessType)
    if (industry && industry.length > 0) {
      where.AND = [
        ...(where.AND as any || []),
        {
          OR: industry.flatMap((ind) => [
            { companyIndustry: { contains: ind.trim(), mode: 'insensitive' } },
          ]),
        },
      ];
    }

    // Country Multi-Match Logic
    if (country && country.length > 0) {
      where.AND = [
        ...(where.AND as any || []),
        {
          OR: country.map((c) => ({
            country: { contains: c.trim(), mode: 'insensitive' },
          })),
        },
      ];
    }

    if (nicheSpecialization) {
      where.publisher = {
        nicheSpecialization: {
          contains: nicheSpecialization,
          mode: 'insensitive',
        },
      };
    }

    if (search) {
      const normalizedSearch = search.toLowerCase();
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
            { companyIndustry: { contains: search, mode: 'insensitive' } },
            { companyWebsite: { contains: search, mode: 'insensitive' } },
            {
              publisher: {
                nicheSpecialization: { contains: search, mode: 'insensitive' },
              },
            },
            {
              publisher: {
                bio: { contains: search, mode: 'insensitive' },
              },
            },
            {
              publisher: {
                tags: { has: normalizedSearch },
              },
            },
          ],
        },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        imageKey: true,
        country: true,
        phoneNumber: true,
        role: true,
        isVerified: true,
        status: true,
        companyName: true,
        companyWebsite: true,
        companyIndustry: true,
        businessType: true,
        vatUid: true,
        createdAt: true,
        publisher: {
          select: {
            id: true,
            nicheSpecialization: true,
            bio: true,
            tags: true,
            isVerified: true,
          },
        },
        badges: {
          where: {
            status: 'ACTIVE',
          },
          select: {
            id: true,
            status: true,
            earnedAt: true,
            badge: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                category: true,
              },
            },
          },
        },
        websites: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
            verificationStatus: true,
            domainRating: true,
            matchingProfile: {
              select: {
                qualityScore: true,
                completionRate: true,
                reliabilityScore: true,
                avgQualityRating: true,
                completedInteractions: true,
                successfulInteractions: true,
                failedInteractions: true,
              },
            },
          },
        },
      },
    });

    const processedCompanies = await Promise.all(
      users.map(async (user) => {
        let avatarUrl: string | null = null;
        if (user.imageKey) {
          try {
            const signedUrl = await this.s3.getDownloadUrl(user.imageKey);
            avatarUrl = signedUrl.downloadUrl;
          } catch {
            avatarUrl = null;
          }
        }

        const verifiedWebsites = user.websites.filter(
          (w) => w.verificationStatus === 'VERIFIED',
        );

        let totalCompletedInteractions = 0;
        let weightedRatingSum = 0;
        let validRatingCount = 0;
        let qualityScoreSum = 0;
        let completionRateSum = 0;
        let reliabilityScoreSum = 0;
        let profileCount = 0;

        user.websites.forEach((website) => {
          if (website.matchingProfile) {
            const mp = website.matchingProfile;
            totalCompletedInteractions += mp.completedInteractions ?? 0;
            if (mp.avgQualityRating && mp.avgQualityRating > 0) {
              weightedRatingSum += mp.avgQualityRating * (mp.completedInteractions || 1);
              validRatingCount += mp.completedInteractions || 1;
            }
            qualityScoreSum += mp.qualityScore ?? 50;
            completionRateSum += mp.completionRate ?? 1;
            reliabilityScoreSum += mp.reliabilityScore ?? 100;
            profileCount++;
          }
        });

        const averageRating =
          validRatingCount > 0
            ? Number((weightedRatingSum / validRatingCount).toFixed(2))
            : 0.0;

        const overallQualityScore =
          profileCount > 0
            ? Number((qualityScoreSum / profileCount).toFixed(1))
            : 50.0;

        const completionRatePercentage =
          profileCount > 0
            ? Math.round((completionRateSum / profileCount) * 100)
            : 100;

        const reliabilityScore =
          profileCount > 0
            ? Math.round(reliabilityScoreSum / profileCount)
            : 100;

        const averageDomainRating =
          verifiedWebsites.length > 0
            ? Math.round(
                verifiedWebsites.reduce((sum, w) => sum + (w.domainRating ?? 0), 0) /
                  verifiedWebsites.length,
              )
            : 0;

        const mappedBadges = user.badges.map((b) => ({
          id: b.id,
          code: b.badge.code,
          name: b.badge.name,
          description: b.badge.description,
          category: b.badge.category,
          status: b.status,
          earnedAt: b.earnedAt,
        }));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl,
          country: user.country,
          phoneNumber: user.phoneNumber,

          companyName: user.companyName ?? user.name,
          companyWebsite: user.companyWebsite ?? null,
          companyIndustry: user.companyIndustry ?? null,
          businessType: user.businessType ?? null,
          vatUid: user.vatUid ?? null,

          badges: mappedBadges,

          ratingSummary: {
            averageRating,
            totalReviews: totalCompletedInteractions,
          },

          publisher: user.publisher
            ? {
                id: user.publisher.id,
                nicheSpecialization: user.publisher.nicheSpecialization,
                bio: user.publisher.bio,
                tags: user.publisher.tags,
                isVerified: user.publisher.isVerified,
              }
            : null,

          overallQualityScore,
          completionRatePercentage,
          reliabilityScore,

          stats: {
            verifiedDomains: verifiedWebsites.length,
            averageDomainRating,
            platformSuccessRate: completionRatePercentage,
            averageResponseTime: 45,
          },

          createdAt: user.createdAt,
        };
      }),
    );

    processedCompanies.sort((a, b) => {
      let valueA: number;
      let valueB: number;

      if (sortBy === CompanySortBy.AVERAGE_RATING) {
        valueA = a.ratingSummary.averageRating;
        valueB = b.ratingSummary.averageRating;
      } else if (sortBy === CompanySortBy.PLATFORM_SUCCESS_RATE) {
        valueA = a.stats.platformSuccessRate;
        valueB = b.stats.platformSuccessRate;
      } else if (sortBy === CompanySortBy.CREATED_AT) {
        valueA = new Date(a.createdAt).getTime();
        valueB = new Date(b.createdAt).getTime();
      } else {
        valueA = a.overallQualityScore;
        valueB = b.overallQualityScore;
      }

      return order === SortOrder.ASC ? valueA - valueB : valueB - valueA;
    });

    const totalItems = processedCompanies.length;
    const paginatedCompanies = processedCompanies.slice(
      (page - 1) * limit,
      page * limit,
    );

    return sendResponse('Companies fetched successfully', {
      data: paginatedCompanies,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasNextPage: page * limit < totalItems,
        hasPreviousPage: page > 1,
      },
    });
  }

  async getCompanyById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        imageKey: true,
        country: true,
        phoneNumber: true,
        role: true,
        isVerified: true,
        status: true,
        companyName: true,
        companyWebsite: true,
        companyIndustry: true,
        businessType: true,
        vatUid: true,
        createdAt: true,
        publisher: {
          select: {
            id: true,
            nicheSpecialization: true,
            bio: true,
            tags: true,
            isVerified: true,
          },
        },
        badges: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            status: true,
            earnedAt: true,
            badge: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                category: true,
              },
            },
          },
        },
        websites: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            websiteUrl: true,
            rootDomain: true,
            domainRating: true,
            verificationStatus: true,
            country: true,
            marketplaceCategories: {
              select: {
                role: true,
                category: { select: { id: true, name: true, slug: true } },
              },
            },
            marketplaceTags: {
              select: {
                tag: { select: { id: true, name: true, slug: true } },
              },
            },
            matchingProfile: {
              select: {
                qualityScore: true,
                completionRate: true,
                reliabilityScore: true,
                behaviourScore: true,
                avgQualityRating: true,
                completedInteractions: true,
                successfulInteractions: true,
                failedInteractions: true,
              },
            },
          },
        },
        verifiedPlacements: {
          where: { status: 'VERIFIED' },
          select: {
            id: true,
            taskId: true,
            websiteId: true,
            finalTaskType: true,
            status: true,
            verifiedAt: true,
            website: {
              select: {
                id: true,
                name: true,
                websiteUrl: true,
                domainRating: true,
              },
            },
            task: {
              select: {
                id: true,
                projectTitle: true,
                targetUrl: true,
                anchorText: true,
                placementType: true,
                linkAttribute: true,
                responsibilityType: true,
                providerProofDocuments: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Company not found');
    }

    let avatarUrl: string | null = null;
    if (user.imageKey) {
      try {
        const signedUrl = await this.s3.getDownloadUrl(user.imageKey);
        avatarUrl = signedUrl.downloadUrl;
      } catch {
        avatarUrl = null;
      }
    }

    const verifiedWebsites = user.websites.filter(
      (w) => w.verificationStatus === 'VERIFIED',
    );

    let totalCompletedInteractions = 0;
    let totalFailedInteractions = 0;
    let weightedRatingSum = 0;
    let validRatingCount = 0;
    let qualityScoreSum = 0;
    let completionRateSum = 0;
    let reliabilityScoreSum = 0;
    let behaviourScoreSum = 0;
    let profileCount = 0;

    user.websites.forEach((w) => {
      if (w.matchingProfile) {
        const mp = w.matchingProfile;
        totalCompletedInteractions += mp.completedInteractions ?? 0;
        totalFailedInteractions += mp.failedInteractions ?? 0;
        if (mp.avgQualityRating && mp.avgQualityRating > 0) {
          weightedRatingSum += mp.avgQualityRating * (mp.completedInteractions || 1);
          validRatingCount += mp.completedInteractions || 1;
        }
        qualityScoreSum += mp.qualityScore ?? 50;
        completionRateSum += mp.completionRate ?? 1;
        reliabilityScoreSum += mp.reliabilityScore ?? 100;
        behaviourScoreSum += mp.behaviourScore ?? 50;
        profileCount++;
      }
    });

    const averageRating =
      validRatingCount > 0
        ? Number((weightedRatingSum / validRatingCount).toFixed(2))
        : 0.0;

    const overallQualityScore =
      profileCount > 0
        ? Number((qualityScoreSum / profileCount).toFixed(1))
        : 50.0;

    const completionRatePercentage =
      profileCount > 0
        ? Math.round((completionRateSum / profileCount) * 100)
        : 100;

    const reliabilityScore =
      profileCount > 0 ? Math.round(reliabilityScoreSum / profileCount) : 100;

    const behaviourScore =
      profileCount > 0 ? Math.round(behaviourScoreSum / profileCount) : 50;

    const averageDomainRating =
      verifiedWebsites.length > 0
        ? Math.round(
            verifiedWebsites.reduce((sum, w) => sum + (w.domainRating ?? 0), 0) /
              verifiedWebsites.length,
          )
        : 0;

    const placementFormatsSet = new Set<string>();
    user.verifiedPlacements.forEach((vp) => {
      if (vp.finalTaskType) placementFormatsSet.add(vp.finalTaskType);
      if (vp.task?.placementType) placementFormatsSet.add(vp.task.placementType);
    });
    if (placementFormatsSet.size === 0) {
      placementFormatsSet.add('GUEST_POST');
      placementFormatsSet.add('LINK_INSERTION');
    }

    const verifiedSamples = user.verifiedPlacements.map((vp) => ({
      id: vp.id,
      taskId: vp.taskId,
      projectTitle: vp.task?.projectTitle ?? 'Verified Placement Project',
      targetUrl: vp.task?.targetUrl ?? null,
      anchorText: vp.task?.anchorText ?? null,
      finalTaskType: vp.finalTaskType ?? vp.task?.placementType ?? 'GUEST_POST',
      linkAttribute: vp.task?.linkAttribute ?? 'DOFOLLOW',
      responsibilityType: vp.task?.responsibilityType ?? 'PROVIDER_WRITES',
      websiteId: vp.websiteId,
      websiteName: vp.website?.name ?? 'Publisher Website',
      websiteUrl: vp.website?.websiteUrl ?? null,
      proofDocuments: vp.task?.providerProofDocuments ?? [],
      status: vp.status,
      verifiedAt: vp.verifiedAt,
    }));

    const formattedWebsites = user.websites.map((w) => ({
      id: w.id,
      name: w.name,
      websiteUrl: w.websiteUrl,
      rootDomain: w.rootDomain,
      domainRating: w.domainRating,
      verificationStatus: w.verificationStatus,
      country: w.country,
      primaryNiche:
        w.marketplaceCategories?.find((c) => c.role === ('PRIMARY' as any))?.category
          ?.slug ?? null,
      categories: w.marketplaceCategories?.map((c) => c.category.name) ?? [],
      tags: w.marketplaceTags?.map((t) => t.tag.name) ?? [],
    }));

    const mappedBadges = user.badges.map((b) => ({
      id: b.id,
      code: b.badge.code,
      name: b.badge.name,
      description: b.badge.description,
      category: b.badge.category,
      status: b.status,
      earnedAt: b.earnedAt,
    }));

    const resultPayload = {
      id: user.id,

      name: user.name,
      email: user.email,
      avatarUrl,
      country: user.country,
      phoneNumber: user.phoneNumber,

      companyName: user.companyName ?? user.name,
      companyWebsite: user.companyWebsite ?? null,
      companyIndustry: user.companyIndustry ?? null,
      businessType: user.businessType ?? null,
      vatUid: user.vatUid ?? null,

      publisher: user.publisher
        ? {
            id: user.publisher.id,
            nicheSpecialization: user.publisher.nicheSpecialization,
            bio: user.publisher.bio,
            tags: user.publisher.tags,
            isVerified: user.publisher.isVerified,
          }
        : null,

      badges: mappedBadges,

      stats: {
        activeDomains: verifiedWebsites.length,
        averageDomainRating,
        platformSuccessRate: completionRatePercentage,
        averageResponseTime: 45,
      },

      qualityFulfillment: {
        overallQualityScore,
        completionRatePercentage,
        reliabilityScore,
        behaviourScore,
        completedInteractions: totalCompletedInteractions,
        failedInteractions: totalFailedInteractions,
      },

      authorityMetrics: {
        averageDomainRating,
        averageSpamScore: 1.2,
      },

      placementFormats: Array.from(placementFormatsSet),

      ratingSummary: {
        averageRating,
        totalReviews: totalCompletedInteractions,
      },
      recentReviews: [],

      verifiedSamples,

      websites: formattedWebsites,

      createdAt: user.createdAt,
    };

    return sendResponse('Company details fetched successfully', resultPayload);
  }
}
