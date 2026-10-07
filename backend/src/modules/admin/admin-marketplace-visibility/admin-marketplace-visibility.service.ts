import { Injectable } from '@nestjs/common';
import {
  Prisma,
  WebsiteMarketplaceVisibilityStatus,
  WebsiteVerificationStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  AdminMarketplaceVisibilityQueryDto,
  MarketplaceVisibilityComplianceFilter,
} from './dto/admin-marketplace-visibility-query.dto';

@Injectable()
export class AdminMarketplaceVisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getMarketplaceVisibility(query: AdminMarketplaceVisibilityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);

    const [total, websites] = await this.prisma.$transaction([
      this.prisma.website.count({ where }),
      this.prisma.website.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { marketplaceVisibilityStatus: 'asc' },
          { updatedAt: 'desc' },
        ],
        select: {
          id: true,
          name: true,
          websiteUrl: true,
          verificationStatus: true,
          marketplaceVisibilityStatus: true,
          visibilityGraceStartedAt: true,
          visibilityGraceEndsAt: true,
          isFlag: true,
          isDeleted: true,
          isWalletLock: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          creditWallet: {
            select: {
              subscriptionTaskCredits: true,
              earnedTaskCredits: true,
              allocatedPurchasedCredits: true,
              allocatedReferralCredits: true,
              visibilityCredits: true,
              visibilityActiveUntil: true,
            },
          },
        },
      }),
    ]);

    const now = new Date();

    const items = websites.map((website) => {
      const taskCredits =
        (website.creditWallet?.subscriptionTaskCredits ?? 0) +
        (website.creditWallet?.earnedTaskCredits ?? 0) +
        (website.creditWallet?.allocatedPurchasedCredits ?? 0) +
        (website.creditWallet?.allocatedReferralCredits ?? 0);
      const compliance = this.resolveCompliance({
        verificationStatus: website.verificationStatus,
        isFlag: website.isFlag,
        isDeleted: website.isDeleted,
        isWalletLock: website.isWalletLock,
      });

      return {
        website: {
          id: website.id,
          name: website.name,
          websiteUrl: website.websiteUrl,
          owner: {
            id: website.author.id,
            name: website.author.name,
            email: website.author.email,
          },
        },
        status: website.marketplaceVisibilityStatus,
        compliance,
        usage: {
          credits: taskCredits,
          label: `${taskCredits} CR`,
        },
        visibility: {
          credits: website.creditWallet?.visibilityCredits ?? 0,
          activeUntil: website.creditWallet?.visibilityActiveUntil ?? null,
          graceStartedAt: website.visibilityGraceStartedAt,
          graceEndsAt: website.visibilityGraceEndsAt,
        },
        graceTimer: this.resolveGraceTimer(
          website.marketplaceVisibilityStatus,
          website.visibilityGraceEndsAt,
          now,
        ),
        authorityAction: {
          label: 'VIEW_PROFILE',
          websiteId: website.id,
        },
      };
    });

    return sendResponse('Marketplace visibility fetched successfully', {
      serverTime: now,
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  private buildWhere(query: AdminMarketplaceVisibilityQueryDto) {
    const where: Prisma.WebsiteWhereInput = {
      isDeleted: false,
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
    };
    const and: Prisma.WebsiteWhereInput[] = [];

    if (query.visibilityStatus) {
      where.marketplaceVisibilityStatus = query.visibilityStatus;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { websiteUrl: { contains: search, mode: 'insensitive' } },
          { author: { name: { contains: search, mode: 'insensitive' } } },
          { author: { email: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (query.compliance) {
      const compliant =
        query.compliance === MarketplaceVisibilityComplianceFilter.COMPLIANT;

      if (compliant) {
        where.isFlag = false;
        where.isWalletLock = false;
      } else {
        and.push({
          OR: [{ isFlag: true }, { isWalletLock: true }],
        });
      }
    }

    if (and.length) {
      where.AND = and;
    }

    return where;
  }

  private resolveCompliance(input: {
    verificationStatus: WebsiteVerificationStatus;
    isFlag: boolean;
    isDeleted: boolean;
    isWalletLock: boolean;
  }) {
    if (
      input.verificationStatus === WebsiteVerificationStatus.VERIFIED &&
      !input.isFlag &&
      !input.isDeleted &&
      !input.isWalletLock
    ) {
      return 'COMPLIANT';
    }

    return 'NON_COMPLIANT';
  }

  private resolveGraceTimer(
    status: WebsiteMarketplaceVisibilityStatus,
    graceEndsAt: Date | null,
    now: Date,
  ) {
    if (
      status !== WebsiteMarketplaceVisibilityStatus.GRACE_PERIOD ||
      !graceEndsAt
    ) {
      return null;
    }

    const remainingSeconds = Math.max(
      0,
      Math.floor((graceEndsAt.getTime() - now.getTime()) / 1000),
    );

    return {
      endsAt: graceEndsAt,
      remainingSeconds,
      serverTime: now,
      remainingTime: this.getDurationParts(remainingSeconds),
      label: this.formatDuration(remainingSeconds),
    };
  }

  private getDurationParts(totalSeconds: number) {
    return {
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  private formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }
}
