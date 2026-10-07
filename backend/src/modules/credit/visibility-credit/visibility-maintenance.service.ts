import { Injectable, Logger } from '@nestjs/common';

import {
  NotificationCategory,
  NotificationEntityType,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/modules/notification/notification.service';

type VisibilityStatus = 'VISIBLE' | 'GRACE_PERIOD' | 'HIDDEN';

type WebsiteVisibilityRow = {
  websiteId: string;
  ownerId: string;
  websiteName: string;
  websiteUrl: string;
  marketplaceVisibilityStatus: VisibilityStatus;
  visibilityGraceEndsAt: Date | null;
  visibilityCredits: number;
  visibilityActiveUntil: Date | null;
  lastActivityAt: Date | null;
};

@Injectable()
export class VisibilityMaintenanceService {
  private readonly logger = new Logger(VisibilityMaintenanceService.name);

  // Testing purpose: production value should be changed to 7 days.
  private readonly inactivityLimitMinutes = 2;
  private readonly gracePeriodMinutes = 2;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async maintainWebsiteVisibility() {
    const now = new Date();
    const inactiveBefore = this.minusMinutes(now, this.inactivityLimitMinutes);
    const graceEndsAt = this.plusMinutes(now, this.gracePeriodMinutes);

    const websites = await this.getVerifiedWebsiteVisibilityRows();

    for (const website of websites) {
      await this.updateWebsiteVisibilityState(
        website,
        now,
        inactiveBefore,
        graceEndsAt,
      );
    }
  }

  private async getVerifiedWebsiteVisibilityRows() {
    return this.prisma.$queryRaw<WebsiteVisibilityRow[]>(Prisma.sql`
      SELECT
        website."id" AS "websiteId",
        website."authorId" AS "ownerId",
        website."name" AS "websiteName",
        website."websiteUrl" AS "websiteUrl",
        website."marketplaceVisibilityStatus"::text AS "marketplaceVisibilityStatus",
        website."visibilityGraceEndsAt" AS "visibilityGraceEndsAt",
        COALESCE(wallet."visibilityCredits", 0)::int AS "visibilityCredits",
        wallet."visibilityActiveUntil" AS "visibilityActiveUntil",
        GREATEST(
          COALESCE(MAX(task."completedAt"), website."verifiedAt", website."createdAt"),
          COALESCE(MAX(placement."verifiedAt"), website."verifiedAt", website."createdAt"),
          COALESCE(website."verifiedAt", website."createdAt")
        ) AS "lastActivityAt"
      FROM "Website" website
      LEFT JOIN "WebsiteCreditWallet" wallet
        ON wallet."websiteId" = website."id"
      LEFT JOIN "PlacementTask" task
        ON (
          task."requesterWebsiteId" = website."id"
          OR task."assignedProviderWebsiteId" = website."id"
        )
        AND task."lifecycleStatus" = 'COMPLETED'::"TaskStatus"
        AND task."completedAt" IS NOT NULL
      LEFT JOIN "WebsiteVerifiedPlacement" placement
        ON placement."websiteId" = website."id"
        AND placement."status" = 'VERIFIED'::"VerifiedPlacementStatus"
      WHERE website."isDeleted" = false
        AND website."verificationStatus" = 'VERIFIED'::"WebsiteVerificationStatus"
      GROUP BY
        website."id",
        website."authorId",
        website."name",
        website."websiteUrl",
        website."marketplaceVisibilityStatus",
        website."visibilityGraceEndsAt",
        website."verifiedAt",
        website."createdAt",
        wallet."visibilityCredits",
        wallet."visibilityActiveUntil"
    `);
  }

  private async updateWebsiteVisibilityState(
    website: WebsiteVisibilityRow,
    now: Date,
    inactiveBefore: Date,
    graceEndsAt: Date,
  ) {
    const hasVisibilityCredit =
      website.visibilityCredits > 0 ||
      (!!website.visibilityActiveUntil && website.visibilityActiveUntil > now);
    const hasRecentTaskActivity =
      !!website.lastActivityAt && website.lastActivityAt > inactiveBefore;

    if (hasVisibilityCredit || hasRecentTaskActivity) {
      if (website.marketplaceVisibilityStatus !== 'VISIBLE') {
        const updated = await this.setWebsiteVisibility(
          website.websiteId,
          'VISIBLE',
          null,
          null,
        );
        if (updated) {
          await this.sendVisibilityNotification(website, {
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'Website visibility restored',
            body: `${website.websiteName} is visible in the marketplace again.`,
            idempotencyKey: `website-visibility-restored-${website.websiteId}-${now.toISOString()}`,
            data: {
              previousStatus: website.marketplaceVisibilityStatus,
              restoredAt: now.toISOString(),
            },
          });
        }
      }
      return;
    }

    if (website.marketplaceVisibilityStatus === 'HIDDEN') {
      return;
    }

    if (website.marketplaceVisibilityStatus === 'GRACE_PERIOD') {
      if (
        website.visibilityGraceEndsAt &&
        website.visibilityGraceEndsAt <= now
      ) {
        const updated = await this.setWebsiteVisibility(
          website.websiteId,
          'HIDDEN',
          null,
          null,
        );
        if (updated) {
          await this.sendVisibilityNotification(website, {
            type: NotificationType.WEBSITE_VISIBILITY_EXPIRED,
            title: 'Website visibility expired',
            body: `${website.websiteName} is now hidden from marketplace discovery.`,
            idempotencyKey: `website-visibility-expired-${website.websiteId}-${website.visibilityGraceEndsAt.toISOString()}`,
            data: {
              previousStatus: website.marketplaceVisibilityStatus,
              expiredAt: now.toISOString(),
            },
          });
        }
      }
      return;
    }

    const updated = await this.setWebsiteVisibility(
      website.websiteId,
      'GRACE_PERIOD',
      now,
      graceEndsAt,
    );
    if (updated) {
      await this.sendVisibilityNotification(website, {
        type: NotificationType.WEBSITE_VISIBILITY_EXPIRING,
        title: 'Website entered grace period',
        body: `${website.websiteName} needs recent activity or visibility credits before it becomes hidden.`,
        idempotencyKey: `website-visibility-grace-${website.websiteId}-${graceEndsAt.toISOString()}`,
        data: {
          previousStatus: website.marketplaceVisibilityStatus,
          graceStartedAt: now.toISOString(),
          graceEndsAt: graceEndsAt.toISOString(),
        },
      });
    }
  }

  private async setWebsiteVisibility(
    websiteId: string,
    status: VisibilityStatus,
    graceStartedAt: Date | null,
    graceEndsAt: Date | null,
  ): Promise<boolean> {
    try {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE "Website"
        SET
          "marketplaceVisibilityStatus" = ${status}::"WebsiteMarketplaceVisibilityStatus",
          "visibilityGraceStartedAt" = ${graceStartedAt},
          "visibilityGraceEndsAt" = ${graceEndsAt},
          "updatedAt" = NOW()
        WHERE "id" = ${websiteId}
      `);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to update marketplace visibility for website ${websiteId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  private minusMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() - minutes * 60 * 1000);
  }

  private plusMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private async sendVisibilityNotification(
    website: WebsiteVisibilityRow,
    input: {
      type: NotificationType;
      title: string;
      body: string;
      idempotencyKey: string;
      data: Record<string, unknown>;
    },
  ) {
    try {
      await this.notificationService.sendNotification({
        recipientId: website.ownerId,
        type: input.type,
        category: NotificationCategory.MARKETPLACE,
        entityType: NotificationEntityType.WEBSITE,
        entityId: website.websiteId,
        title: input.title,
        body: input.body,
        data: {
          websiteId: website.websiteId,
          websiteName: website.websiteName,
          websiteUrl: website.websiteUrl,
          ...input.data,
        },
        idempotencyKey: input.idempotencyKey,
      });
    } catch (error) {
      this.logger.warn(
        `Visibility notification skipped for website ${website.websiteId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
