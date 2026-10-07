import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RankingPeriod,
  ShowcaseEntityType,
  ShowcaseSection,
  UserRole,
  UserStatus,
  WebsiteMarketplaceVisibilityStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  getShowcaseSectionConfig,
  isAutoShowcaseSection,
  isShowcaseSectionEntityTypeCompatible,
} from '../community-showcase.constants';
import {
  AdminShowcaseListQueryDto,
  CreateShowcaseEntryDto,
  RankingRecalculateDto,
  ShowcaseStatsRefreshDto,
  UpdateShowcaseEntryDto,
} from '../dto';
import {
  clampGenerationLimit,
  normalizePagination,
  safeDate,
} from '../community-showcase.utils';
import { CommunityRankingSnapshotService } from './community-ranking-snapshot.service';
import { UserShowcaseStatsService } from './user-showcase-stats.service';
import { WebsiteShowcaseStatsService } from './website-showcase-stats.service';

@Injectable()
export class AdminShowcaseManagementService {
  private readonly logger = new Logger(AdminShowcaseManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communityRankingSnapshotService: CommunityRankingSnapshotService,
    private readonly userShowcaseStatsService: UserShowcaseStatsService,
    private readonly websiteShowcaseStatsService: WebsiteShowcaseStatsService,
  ) {}

  async listEntries(query: AdminShowcaseListQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit, 100);

    const where: Prisma.CommunityShowcaseEntryWhereInput = {
      ...(query.section ? { section: query.section } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(typeof query.isVisible === 'boolean' ? { isVisible: query.isVisible } : {}),
      ...(typeof query.isFeatured === 'boolean' ? { isFeatured: query.isFeatured } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { subtitle: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { reason: { contains: query.search, mode: 'insensitive' } },
              { entityId: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.communityShowcaseEntry.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.communityShowcaseEntry.count({ where }),
    ]);

    const items = await this.hydrateAdminEntries(rows);

    return sendResponse('Admin community showcase entries fetched successfully.', {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  }

  async createEntry(dto: CreateShowcaseEntryDto, adminId?: string) {
    this.assertSectionCompatibility(dto.section, dto.entityType);
    const entity = await this.assertEntityExists(dto.entityType, dto.entityId, dto.showExternalLink);
    const featuredFrom = safeDate(dto.featuredFrom ?? null);
    const featuredUntil = safeDate(dto.featuredUntil ?? null);
    this.assertDateWindow(featuredFrom, featuredUntil);

    if (dto.isVisible !== false) {
      const duplicate = await this.prisma.communityShowcaseEntry.findFirst({
        where: {
          section: dto.section,
          entityType: dto.entityType,
          entityId: dto.entityId,
          isVisible: true,
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          'A visible showcase entry already exists for this section/entity.',
        );
      }
    }

    const created = await this.prisma.communityShowcaseEntry.create({
      data: {
        section: dto.section,
        entityType: dto.entityType,
        entityId: dto.entityId,
        title: dto.title?.trim() || null,
        subtitle: dto.subtitle?.trim() || null,
        description: dto.description?.trim() || null,
        isVisible: dto.isVisible ?? true,
        isFeatured: dto.isFeatured ?? true,
        sortOrder: dto.sortOrder ?? 0,
        priority: dto.priority ?? 0,
        featuredFrom,
        featuredUntil,
        showExternalLink: dto.showExternalLink ?? false,
        linkType: dto.linkType ?? null,
        createdByAdminId: adminId ?? null,
        updatedByAdminId: adminId ?? null,
        reason: dto.reason?.trim() || null,
      },
    });

    return sendResponse('Community showcase entry created successfully.', {
      entry: created,
      entity,
    });
  }

  async updateEntry(id: string, dto: UpdateShowcaseEntryDto, adminId?: string) {
    const existing = await this.prisma.communityShowcaseEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Community showcase entry not found.');
    }

    const nextSection = dto.section ?? existing.section;
    const nextEntityType = dto.entityType ?? existing.entityType;
    const nextEntityId = dto.entityId ?? existing.entityId;
    const nextShowExternalLink = dto.showExternalLink ?? existing.showExternalLink;

    this.assertSectionCompatibility(nextSection, nextEntityType);
    const entity = await this.assertEntityExists(
      nextEntityType,
      nextEntityId,
      nextShowExternalLink,
    );

    const featuredFrom =
      dto.featuredFrom !== undefined
        ? safeDate(dto.featuredFrom ?? null)
        : existing.featuredFrom;
    const featuredUntil =
      dto.featuredUntil !== undefined
        ? safeDate(dto.featuredUntil ?? null)
        : existing.featuredUntil;
    this.assertDateWindow(featuredFrom, featuredUntil);

    const nextVisible = dto.isVisible ?? existing.isVisible;
    if (nextVisible) {
      const duplicate = await this.prisma.communityShowcaseEntry.findFirst({
        where: {
          id: { not: id },
          section: nextSection,
          entityType: nextEntityType,
          entityId: nextEntityId,
          isVisible: true,
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          'A visible showcase entry already exists for this section/entity.',
        );
      }
    }

    const updated = await this.prisma.communityShowcaseEntry.update({
      where: { id },
      data: {
        section: nextSection,
        entityType: nextEntityType,
        entityId: nextEntityId,
        title: dto.title !== undefined ? dto.title?.trim() || null : undefined,
        subtitle:
          dto.subtitle !== undefined ? dto.subtitle?.trim() || null : undefined,
        description:
          dto.description !== undefined ? dto.description?.trim() || null : undefined,
        isVisible: dto.isVisible,
        isFeatured: dto.isFeatured,
        sortOrder: dto.sortOrder,
        priority: dto.priority,
        featuredFrom,
        featuredUntil,
        showExternalLink: dto.showExternalLink,
        linkType: dto.linkType !== undefined ? dto.linkType : undefined,
        updatedByAdminId: adminId ?? null,
        reason: dto.reason !== undefined ? dto.reason?.trim() || null : undefined,
      },
    });

    return sendResponse('Community showcase entry updated successfully.', {
      entry: updated,
      entity,
    });
  }

  async hideEntry(id: string, adminId?: string) {
    const existing = await this.prisma.communityShowcaseEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Community showcase entry not found.');
    }

    const updated = await this.prisma.communityShowcaseEntry.update({
      where: { id },
      data: {
        isVisible: false,
        updatedByAdminId: adminId ?? null,
      },
    });

    return sendResponse('Community showcase entry hidden successfully.', updated);
  }

  async recalculateRankings(dto: RankingRecalculateDto = {}) {
    if (!dto.section) {
      const result = await this.communityRankingSnapshotService.generateAllSnapshots();
      return sendResponse('Community showcase rankings recalculated successfully.', result);
    }

    const config = getShowcaseSectionConfig(dto.section);
    if (!config) {
      throw new BadRequestException('Unsupported showcase section.');
    }

    if (!isAutoShowcaseSection(dto.section)) {
      throw new BadRequestException('This section is admin-curated and does not use snapshots.');
    }

    const entityType = dto.entityType ?? config.entityType;
    this.assertSectionCompatibility(dto.section, entityType);

    const period = dto.period ?? config.defaultPeriod;
    const result = await this.communityRankingSnapshotService.generateSnapshot({
      section: dto.section,
      period,
      entityType,
      limit: clampGenerationLimit(dto.limit),
    });

    return sendResponse('Community showcase ranking snapshot generated successfully.', result);
  }

  async refreshStats(dto: ShowcaseStatsRefreshDto = {}) {
    const limit = clampGenerationLimit(dto.limit);

    if (!dto.entityType) {
      const [users, websites] = await Promise.all([
        this.userShowcaseStatsService.refreshAllUserStats(limit),
        this.websiteShowcaseStatsService.refreshAllWebsiteStats(limit),
      ]);

      return sendResponse('Community showcase stats refreshed successfully.', {
        users,
        websites,
      });
    }

    if (dto.entityType === ShowcaseEntityType.USER) {
      const result = dto.entityId
        ? await this.userShowcaseStatsService.refreshUserStats(dto.entityId)
        : await this.userShowcaseStatsService.refreshAllUserStats(limit);

      return sendResponse('User showcase stats refreshed successfully.', result);
    }

    const result = dto.entityId
      ? await this.websiteShowcaseStatsService.refreshWebsiteStats(dto.entityId)
      : await this.websiteShowcaseStatsService.refreshAllWebsiteStats(limit);

    return sendResponse('Website showcase stats refreshed successfully.', result);
  }

  private assertSectionCompatibility(
    section: ShowcaseSection,
    entityType: ShowcaseEntityType,
  ) {
    if (!isShowcaseSectionEntityTypeCompatible(section, entityType)) {
      throw new BadRequestException('section and entityType are not compatible.');
    }
  }

  private async assertEntityExists(
    entityType: ShowcaseEntityType,
    entityId: string,
    showExternalLink?: boolean,
  ) {
    if (entityType === ShowcaseEntityType.USER) {
      const user = await this.prisma.user.findFirst({
        where: {
          id: entityId,
          role: UserRole.USER,
          isDeleted: false,
          status: UserStatus.ACTIVE,
        },
        select: {
          id: true,
          name: true,
          country: true,
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
            },
          },
        },
      });

      if (!user) {
        throw new BadRequestException('Referenced user does not exist or is not publicly eligible.');
      }

      if (showExternalLink && user.websites.length === 0) {
        throw new BadRequestException(
          'showExternalLink requires at least one public-safe website for this user.',
        );
      }

      return user;
    }

    const website = await this.prisma.website.findFirst({
      where: {
        id: entityId,
        isDeleted: false,
        isFlag: false,
      },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
      },
    });

    if (!website) {
      throw new BadRequestException('Referenced website does not exist or is not publicly eligible.');
    }

    if (showExternalLink && !website.websiteUrl?.trim()) {
      throw new BadRequestException('showExternalLink requires a valid website URL.');
    }

    return website;
  }

  private assertDateWindow(featuredFrom?: Date | null, featuredUntil?: Date | null) {
    if (featuredFrom && featuredUntil && featuredFrom > featuredUntil) {
      throw new BadRequestException('featuredFrom must be before featuredUntil.');
    }
  }

  private async hydrateAdminEntries(rows: any[]) {
    const userIds = rows
      .filter((row) => row.entityType === ShowcaseEntityType.USER)
      .map((row) => row.entityId);
    const websiteIds = rows
      .filter((row) => row.entityType === ShowcaseEntityType.WEBSITE)
      .map((row) => row.entityId);

    const [users, websites] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, country: true, status: true },
          })
        : Promise.resolve([]),
      websiteIds.length
        ? this.prisma.website.findMany({
            where: { id: { in: websiteIds } },
            select: {
              id: true,
              name: true,
              websiteUrl: true,
              country: true,
              verificationStatus: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map<string, any>(users.map((item: any) => [item.id, item] as [string, any]));
    const websiteMap = new Map<string, any>(websites.map((item: any) => [item.id, item] as [string, any]));

    return rows.map((row) => ({
      ...row,
      entity:
        row.entityType === ShowcaseEntityType.USER
          ? userMap.get(row.entityId) ?? null
          : websiteMap.get(row.entityId) ?? null,
    }));
  }
}
