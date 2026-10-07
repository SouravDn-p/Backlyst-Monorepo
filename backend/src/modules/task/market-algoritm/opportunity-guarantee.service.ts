import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { BoostService } from './boost.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import {
  NotificationType,
  NotificationCategory,
  NotificationEntityType,
} from '@prisma/client';

@Injectable()
export class OpportunityGuaranteeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boostService: BoostService,
    private readonly notificationService: NotificationService,
  ) {}

  async refreshOpportunityFairness() {
    const now = new Date();
    const profiles = await this.prisma.websiteMatchingProfile.findMany({
      where: {
        marketplaceStatus: 'ACTIVE',
        OR: [{ isSuppressed: false }, { suppressedUntil: { lt: now } }],
      },
      select: {
        id: true,
        lastMatchedAt: true,
        createdAt: true,
        boostFactor: true,
        firstSuccessAt: true,
        firstSuccessBoostActive: true,
        website: { select: { authorId: true } },
      },
    });

    await Promise.all(
      profiles.map(async (profile) => {
        const lastMatchAt = profile.lastMatchedAt ?? profile.createdAt;
        const hoursSinceLastMatch = Math.max(
          0,
          (now.getTime() - lastMatchAt.getTime()) / (60 * 60 * 1000),
        );
        const opportunityScore = Math.min(
          100,
          Math.log1p(hoursSinceLastMatch) * 10,
        );
        // Starved-new-user boost is owned by BoostService, which gates on
        // `firstSuccessBoostActive && !firstSuccessAt` and applies the same
        // Math.min(3, ...) cap, so the cron path and the completion path can
        // never disagree or over-boost. The method clears
        // firstSuccessBoostActive once granted, keeping the boost one-time.
        const { boostFactor, firstSuccessBoostActive } =
          this.boostService.applyNewUserBoost(
            {
              boostFactor: profile.boostFactor,
              firstSuccessAt: profile.firstSuccessAt,
              firstSuccessBoostActive: profile.firstSuccessBoostActive,
            },
            { hoursSinceLastMatch },
          );

        // Spec §18: Inactivity Reminders
        if (hoursSinceLastMatch > 168 && profile.website?.authorId) {
          // Idempotency key based on week-of-year to restrict to 1/week
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const weekNum = Math.ceil(
            ((now.getTime() - startOfYear.getTime()) / 86400000 +
              startOfYear.getDay() +
              1) /
              7,
          );
          const idempotencyKey = `inactivity_reminder_${now.getFullYear()}_W${weekNum}`;

          await this.notificationService
            .sendNotification({
              recipientId: profile.website.authorId,
              type: NotificationType.MARKETPLACE_LOW_ACTIVITY_REMINDER,
              category: NotificationCategory.MARKETPLACE,
              entityType: NotificationEntityType.WEBSITE,
              entityId: profile.id, // using the profile's website ID context
              title: 'Marketplace Inactivity Reminder',
              body: "You haven't received a match in a while. Make sure your profile is up to date and active.",
              idempotencyKey,
              data: { hoursSinceLastMatch },
            })
            .catch(() => undefined); // Swallow errors to not break cron
        }

        return this.prisma.websiteMatchingProfile.update({
          where: { id: profile.id },
          data: {
            opportunityScore,
            boostFactor,
            firstSuccessBoostActive,
            forceMatchNext: hoursSinceLastMatch > 168,
          },
        });
      }),
    );
  }
}
