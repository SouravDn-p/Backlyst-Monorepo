import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  UserRole,
  WebsiteVerificationStatus,
  WebsiteVerificationType,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CreateWebsiteDto } from './dto/create-website.dto';
import { UpdateWebsiteDto } from './dto/update-website.dto';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';

// import { S3UploadService } from 'src/common/upload-file/s3-upload.service';

import { TaskRequesterService } from 'src/modules/task/task-requester/task-requester.service';
@Injectable()
export class WebsiteService {
  private readonly logger = new Logger(WebsiteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: AwsS3Service,
    private readonly taskRequesterService: TaskRequesterService,
  ) {}

  // async create(authorId: string, createWebsiteDto: CreateWebsiteDto) {
  //   const websiteUrl = createWebsiteDto.websiteUrl
  //     .toLowerCase()
  //     .replace(/^https?:\/\//, '')
  //     .replace(/\/$/, '');

  //   try {
  //     const result = await this.prisma.website.create({
  //       data: {
  //         authorId,
  //         name: createWebsiteDto.name,
  //         websiteUrl,
  //         industry: createWebsiteDto.industry,
  //         country: createWebsiteDto.country,
  //         verificationStatus: 'PENDING',
  //       },
  //       select: {
  //         id: true,
  //         websiteUrl: true,
  //         industry: true,
  //         country: true,
  //         verificationStatus: true,
  //         marketplaceVisibilityStatus: true,
  //         visibilityGraceStartedAt: true,
  //         visibilityGraceEndsAt: true,
  //       },
  //     });

  //     return sendResponse(
  //       'Website added successfully, wait for verification',
  //       result,
  //     );
  //   } catch (error) {
  //     if (
  //       error instanceof Prisma.PrismaClientKnownRequestError &&
  //       error.code === 'P2002'
  //     ) {
  //       throw new ConflictException('Website already exists');
  //     }
  //     throw error;
  //   }
  // }

  async create(authorId: string, createWebsiteDto: CreateWebsiteDto) {
    const websiteUrl = createWebsiteDto.websiteUrl
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    const rootDomain = this.getRootDomain(createWebsiteDto.websiteUrl);

    const finalCategoryId =
      createWebsiteDto.marketplaceCategoryId ||
      createWebsiteDto.primaryCategoryId;
    if (!finalCategoryId) {
      throw new BadRequestException(
        'Either marketplaceCategoryId or primaryCategoryId must be provided.',
      );
    }
    if (
      createWebsiteDto.marketplaceCategoryId &&
      createWebsiteDto.primaryCategoryId &&
      createWebsiteDto.marketplaceCategoryId !==
        createWebsiteDto.primaryCategoryId
    ) {
      throw new BadRequestException(
        'marketplaceCategoryId and primaryCategoryId cannot have conflicting values.',
      );
    }

    const uniqueSecondaryIds = Array.from(
      new Set<string>(createWebsiteDto.secondaryMarketplaceCategoryIds || []),
    );
    const allCategoryIdsToVerify = Array.from(
      new Set<string>([finalCategoryId, ...uniqueSecondaryIds]),
    );

    const cats = await this.prisma.marketplaceCategory.findMany({
      where: { id: { in: allCategoryIdsToVerify }, enabled: true },
    });
    if (cats.length !== allCategoryIdsToVerify.length) {
      throw new NotFoundException(
        'One or more Marketplace Categories are not found or disabled',
      );
    }

    const categoryCreates = [
      { categoryId: finalCategoryId, role: 'PRIMARY' as any },
      ...uniqueSecondaryIds.map((id) => ({
        categoryId: id,
        role: 'SECONDARY' as any,
      })),
    ];

    const finalTagIds =
      createWebsiteDto.marketplaceTagIds ||
      createWebsiteDto.marketplaceTagKeys ||
      [];
    if (
      createWebsiteDto.marketplaceTagIds &&
      createWebsiteDto.marketplaceTagKeys
    ) {
      const set1 = new Set(createWebsiteDto.marketplaceTagIds);
      const set2 = new Set(createWebsiteDto.marketplaceTagKeys);
      if (set1.size !== set2.size || [...set1].some((id) => !set2.has(id))) {
        throw new BadRequestException(
          'marketplaceTagIds and marketplaceTagKeys cannot have conflicting values.',
        );
      }
    }

    const uniqueTagIds = [...new Set(finalTagIds)];
    if (uniqueTagIds.length > 0) {
      const tags = await this.prisma.marketplaceTag.findMany({
        where: { id: { in: uniqueTagIds }, enabled: true },
      });
      if (tags.length !== uniqueTagIds.length) {
        throw new NotFoundException(
          'One or more Marketplace Tags are invalid or disabled',
        );
      }
    }

    try {
      const result = await this.prisma.website.create({
        data: {
          authorId,
          name: createWebsiteDto.name,
          websiteUrl,
          industry: createWebsiteDto.industry,
          country: createWebsiteDto.country,
          rootDomain,
          marketplaceCategories: { create: categoryCreates },
          ...(uniqueTagIds.length > 0 && {
            marketplaceTags: {
              create: uniqueTagIds.map((id) => ({ tagId: id })),
            },
          }),
          verificationStatus: 'PENDING',
        },
        include: {
          marketplaceCategories: { include: { category: true } },
          marketplaceTags: { include: { tag: true } },
        },
      });

      return sendResponse(
        'Website added successfully, wait for verification',
        result,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Website already exists');
      }

      throw error;
    }
  }

  private getRootDomain(websiteUrl: string) {
    const normalizedUrl =
      websiteUrl.startsWith('http://') || websiteUrl.startsWith('https://')
        ? websiteUrl
        : `https://${websiteUrl}`;

    const url = new URL(normalizedUrl);

    return url.hostname.toLowerCase().replace(/^www\./, '');
  }

  async findAll(
    page = 1,
    limit = 10,

    verificationStatus?: WebsiteVerificationStatus,
    verificationType?: WebsiteVerificationType,

    authorId?: string,
    verificationRequestStatus?: WebsiteVerificationStatus,
  ) {
    limit = Math.min(limit, 50);

    const where: Prisma.WebsiteWhereInput = {
      isDeleted: false,

      ...(verificationStatus && {
        verificationStatus,
      }),

      ...(authorId && {
        authorId,
      }),

      ...((verificationType || verificationRequestStatus) && {
        websiteVerifications: {
          some: {
            ...(verificationType && {
              type: verificationType,
            }),
            ...(verificationRequestStatus && {
              status: verificationRequestStatus,
            }),
          },
        },
      }),
    };

    const [totalItems, websites] = await this.prisma.$transaction([
      this.prisma.website.count({
        where,
      }),

      this.prisma.website.findMany({
        where,

        skip: (page - 1) * limit,
        take: limit,

        orderBy: {
          createdAt: 'desc',
        },

        // select: {
        //   id: true,
        //   name: true,

        //   websiteUrl: true,

        //   verificationStatus: true,
        //   verifiedAt: true,
        //   verifiedMethod: true,
        //   marketplaceVisibilityStatus: true,
        //   visibilityGraceStartedAt: true,
        //   visibilityGraceEndsAt: true,

        //   industry: true,
        //   country: true,

        //   createdAt: true,

        //   author: {
        //     select: {
        //       id: true,
        //       name: true,
        //       email: true,
        //       imageKey: true,
        //     },
        //   },

        //   websiteVerifications: {
        //     take: 1,
        //     orderBy: {
        //       createdAt: 'desc',
        //     },
        //     select: {
        //       id: true,
        //       type: true,
        //       status: true,
        //       rejectReason: true,
        //       errorMessage: true,
        //       manualReviewNotes: true,
        //       createdAt: true,
        //       updatedAt: true,
        //     },
        //   },
        // },

select: {
  id: true,
  name: true,

  websiteUrl: true,

  verificationStatus: true,
  verifiedAt: true,
  verifiedMethod: true,
  marketplaceVisibilityStatus: true,
  visibilityGraceStartedAt: true,
  visibilityGraceEndsAt: true,

  industry: true,
  country: true,

  createdAt: true,

  marketplaceCategories: {
    select: {
      categoryId: true,
      role: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },

  marketplaceTags: {
    select: {
      tagId: true,
      tag: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },

  author: {
    select: {
      id: true,
      name: true,
      email: true,
      imageKey: true,
    },
  },

  websiteVerifications: {
    take: 1,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      type: true,
      status: true,
      rejectReason: true,
      errorMessage: true,
      manualReviewNotes: true,
      createdAt: true,
      updatedAt: true,
    },
  },
}

      }),
    ]);

    const data = await Promise.all(
      websites.map(async (website) => {
        let imageUrl: string | null = null;

        if (website.author.imageKey) {
          imageUrl = (await this.s3.getDownloadUrl(website.author.imageKey))
            .downloadUrl;
        }

        const { imageKey, ...author } = website.author;

        return {
          ...website,

          author: {
            ...author,
            imageUrl,
          },
        };
      }),
    );

    return sendResponse('Websites fetched successfully', {
      data,

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

  async findMyWebsites(
    authorId: string,
    page?: number,
    limit?: number,
    verificationStatus?: WebsiteVerificationStatus,
    verificationRequestStatus?: WebsiteVerificationStatus,
  ) {
    return this.findAll(
      page,
      limit,
      verificationStatus,
      undefined,
      authorId,
      verificationRequestStatus,
    );
  }

  async lockWebsite(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        isDeleted: true,
        isWalletLock: true,
      },
    });

    if (!website || website.isDeleted) {
      throw new NotFoundException('Website not found');
    }

    const nextWalletLockStatus = !website.isWalletLock;

    const updatedWebsite = await this.prisma.website.update({
      where: { id: websiteId },
      data: {
        isWalletLock: nextWalletLockStatus,
      },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        isWalletLock: true,
        updatedAt: true,
      },
    });

    return sendResponse(
      nextWalletLockStatus
        ? 'Website wallet locked successfully'
        : 'Website wallet unlocked successfully',
      updatedWebsite,
    );
  }

  async flagWebsite(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        isDeleted: true,
        isFlag: true,
      },
    });

    if (!website || website.isDeleted) {
      throw new NotFoundException('Website not found');
    }

    const nextFlagStatus = !website.isFlag;

    const updatedWebsite = await this.prisma.website.update({
      where: { id: websiteId },
      data: {
        isFlag: nextFlagStatus,
      },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        isFlag: true,
        updatedAt: true,
      },
    });

    return sendResponse(
      nextFlagStatus
        ? 'Website flagged successfully'
        : 'Website unflagged successfully',
      updatedWebsite,
    );
  }

  async findOne(id: string, currentUserId: string, currentUserRole: UserRole) {
    const website = await this.prisma.website.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    this.ensureAccess(website.authorId, currentUserId, currentUserRole);

    // Spec §22: surface read-only trust indicators on the public website profile.
    // Only the user-visible metrics are exposed; internal risk/failed/restriction
    // fields are intentionally excluded.
    const trust = await this.getPublicTrustBlock(id);

    const mozAnalytics:
      | Awaited<ReturnType<TaskRequesterService['getDomainMozStats']>>['data']
      | null = null;

    try {
      const website = await this.prisma.website.findFirst({
        where: {
          id,
          isDeleted: false,
        },
      });

      if (!website) {
        throw new NotFoundException('Website not found');
      }

      this.ensureAccess(website.authorId, currentUserId, currentUserRole);

      let mozAnalytics: unknown = null;
      let mozAnalyticsError: string | null = null;

      try {
        const mozStats = await this.taskRequesterService.getDomainMozStats(
          website.websiteUrl,
        );

        mozAnalytics = mozStats.data;
      } catch (error) {
        mozAnalyticsError =
          error instanceof Error ? error.message : 'Failed to fetch MOZ stats';
      }

      const logoUrl = await this.s3.resolveFileUrl(website.logoKey ?? null);

      return sendResponse('Website fetched successfully', {
        ...website,
        logoUrl,
        mozAnalytics,
        mozAnalyticsError,
        trust,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown MOZ analytics error';

      this.logger.warn(
        `Failed to fetch MOZ analytics for website ${website.id}: ${message}`,
      );
    }

    const logoUrl = await this.s3.resolveFileUrl(website.logoKey ?? null);

    return sendResponse('Website fetched successfully', {
      ...website,
      logoUrl,
      mozAnalytics,
      trust,
    });
  }

  /**
   * Spec §22: build the read-only trust indicator block from a website's
   * matching profile. Only user-visible metrics are returned; internal
   * `riskScore`, `failedInteractions`, and `restrictions` are excluded.
   * Returns `null` when no matching profile exists (so callers can omit it).
   */
  async getPublicTrustBlock(websiteId: string): Promise<{
    reliabilityScore: number;
    reputationScore: number;
    completedInteractions: number;
    completionRate: number;
    avgQualityRating: number;
  } | null> {
    const profile = await this.prisma.websiteMatchingProfile.findUnique({
      where: { websiteId },
      select: {
        completedInteractions: true,
        completionRate: true,
        reliabilityScore: true,
        avgQualityRating: true,
        reputationScore: true,
      },
    });

    if (!profile) return null;

    return {
      reliabilityScore: profile.reliabilityScore,
      reputationScore: profile.reputationScore,
      completedInteractions: profile.completedInteractions,
      completionRate: profile.completionRate,
      avgQualityRating: profile.avgQualityRating,
    };
  }

  async getTrustMetrics(
    id: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ) {
    const website = await this.prisma.website.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    this.ensureAccess(website.authorId, currentUserId, currentUserRole);

    const profile = await this.prisma.websiteMatchingProfile.findUnique({
      where: { websiteId: id },
      select: {
        completedInteractions: true,
        successfulInteractions: true,
        failedInteractions: true,
        completionRate: true,
        reliabilityScore: true,
        avgQualityRating: true,
        reputationScore: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Trust profile not found');
    }

    return sendResponse('Trust metrics fetched successfully', profile);
  }

  async update(id: string, currentUserId: string, payload: UpdateWebsiteDto) {
    const website = await this.prisma.website.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
      },
    });

    if (!website || website.isDeleted) {
      throw new NotFoundException('Website not found');
    }

    if (website.authorId !== currentUserId) {
      throw new ForbiddenException('You cannot update this website');
    }

    const updateData: Prisma.WebsiteUpdateInput = {};

    let categoryCreates: { categoryId: string; role: any }[] | undefined =
      undefined;

    if (
      payload.marketplaceCategoryId ||
      payload.secondaryMarketplaceCategoryIds
    ) {
      // Fetch current categories if we are doing a partial update
      const existingCategories =
        await this.prisma.websiteMarketplaceCategory.findMany({
          where: { websiteId: id },
        });

      const currentPrimary = existingCategories.find(
        (c) => c.role === 'PRIMARY',
      )?.categoryId;
      const currentSecondary = existingCategories
        .filter((c) => c.role === 'SECONDARY')
        .map((c) => c.categoryId);

      const finalPrimary =
        payload.marketplaceCategoryId !== undefined
          ? payload.marketplaceCategoryId
          : currentPrimary;
      const finalSecondary =
        payload.secondaryMarketplaceCategoryIds !== undefined
          ? payload.secondaryMarketplaceCategoryIds
          : currentSecondary;

      if (!finalPrimary) {
        throw new BadRequestException('Primary category is required.');
      }

      const uniqueSecondaryIds = [...new Set(finalSecondary)];
      if (uniqueSecondaryIds.includes(finalPrimary)) {
        throw new BadRequestException(
          'A category cannot be both PRIMARY and SECONDARY.',
        );
      }

      const allCatIds = [finalPrimary, ...uniqueSecondaryIds];
      const cats = await this.prisma.marketplaceCategory.findMany({
        where: { id: { in: allCatIds }, enabled: true },
      });
      if (cats.length !== allCatIds.length) {
        throw new NotFoundException(
          'One or more Marketplace Categories are not found or disabled',
        );
      }

      categoryCreates = [
        { categoryId: finalPrimary, role: 'PRIMARY' as any },
        ...uniqueSecondaryIds.map((cid) => ({
          categoryId: cid,
          role: 'SECONDARY' as any,
        })),
      ];
    }

    let newMarketplaceTagIds: string[] | undefined;
    if (payload.marketplaceTagIds) {
      newMarketplaceTagIds = [...new Set(payload.marketplaceTagIds)];
      if (newMarketplaceTagIds.length > 0) {
        const tags = await this.prisma.marketplaceTag.findMany({
          where: { id: { in: newMarketplaceTagIds }, enabled: true },
        });
        if (tags.length !== newMarketplaceTagIds.length) {
          throw new NotFoundException(
            'One or more Marketplace Tags are invalid or disabled',
          );
        }
      }
    }

    Object.assign(updateData, {
      ...(payload.name && { name: payload.name }),
      ...(payload.industry && { industry: payload.industry }),
      ...(payload.country && { country: payload.country }),
      ...(payload.description && { description: payload.description }),
      ...(payload.tagline && { tagline: payload.tagline }),
      ...(payload.logoKey && { logoKey: payload.logoKey }),
      ...(categoryCreates && {
        marketplaceCategories: {
          deleteMany: {},
          create: categoryCreates,
        },
      }),
      ...(payload.marketplaceTagIds && {
        marketplaceTags: {
          deleteMany: {},
          create: newMarketplaceTagIds?.map((id) => ({ tagId: id })) || [],
        },
      }),
    });

    if (Object.keys(updateData).length === 0) {
      return sendResponse('Nothing to update', null);
    }

    const result = await this.prisma.website.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        industry: true,
        country: true,
        verificationStatus: true,
        description: true,
        tagline: true,
        verifiedAt: true,
        verifiedMethod: true,
        logoKey: true,
      },
    });

    const logoUrl = await this.s3.resolveFileUrl(result.logoKey ?? null);

    return sendResponse('Website updated successfully', {
      ...result,
      logoUrl,
    });
  }

  async remove(id: string, currentUserId: string, currentUserRole: UserRole) {
    const website = await this.prisma.website.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    this.ensureAccess(website.authorId, currentUserId, currentUserRole);

    await this.prisma.website.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return sendResponse('Website deleted successfully');
  }

  private ensureAccess(
    authorId: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ) {
    if (currentUserRole === UserRole.ADMIN) {
      return;
    }

    if (authorId !== currentUserId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
