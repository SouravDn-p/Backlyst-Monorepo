import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { SupplyDemandRebalancerService } from './supply-demand-rebalancer.service';
import { NotificationType, NotificationCategory } from '@prisma/client';

/**
 * Spec §19 — Supply vs Demand Imbalance Monitoring.
 *
 * Runs daily at 05:00. Monitors the ratio of OPEN / WAITING_FOR_APPLICANTS tasks
 * to ACTIVE provider websites (with a matching profile). If demand drastically
 * exceeds supply (>5x) or falls behind (<0.2x), it emits ADMIN_SUPPLY_DEMAND_IMBALANCE.
 */
@Injectable()
export class SupplyDemandMonitorService {
  private readonly logger = new Logger(SupplyDemandMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly rebalancer: SupplyDemandRebalancerService,
  ) {}

  async checkImbalance() {
    try {
      const activeProvidersCount = await this.prisma.website.count({
        where: {
          isDeleted: false,
          verificationStatus: 'VERIFIED',
          marketplaceVisibilityStatus: 'VISIBLE',
          matchingProfile: { isNot: null },
        },
      });

      const activeTasksCount = await this.prisma.placementTask.count({
        where: {
          lifecycleStatus: { in: ['OPEN', 'WAITING_FOR_APPLICANTS'] },
        },
      });

      if (activeProvidersCount === 0) {
        if (activeTasksCount > 0) {
          await this.emitNotification(
            'CRITICAL',
            activeTasksCount,
            activeProvidersCount,
            'Infinite (0 providers)',
          );
        }
        return;
      }

      const ratio = activeTasksCount / activeProvidersCount;
      if (ratio > 5) {
        await this.emitNotification(
          'HIGH_DEMAND',
          activeTasksCount,
          activeProvidersCount,
          ratio.toFixed(2),
        );
        await this.rebalancer.handleDemandSurplus();
      } else if (ratio < 0.2) {
        await this.emitNotification(
          'LOW_DEMAND',
          activeTasksCount,
          activeProvidersCount,
          ratio.toFixed(2),
        );
        await this.rebalancer.handleSupplySurplus();
      }
    } catch (err) {
      this.logger.error(
        `Supply/Demand monitor failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  private async emitNotification(
    state: string,
    tasks: number,
    providers: number,
    ratio: string,
  ) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.notificationService.sendAdminNotification({
        type: NotificationType.ADMIN_SUPPLY_DEMAND_IMBALANCE,
        category: NotificationCategory.ADMIN_RISK,
        title: 'Marketplace Supply/Demand Imbalance',
        body: `State: ${state}. Tasks: ${tasks}, Providers: ${providers}, Ratio: ${ratio}. Action may be required to balance the ecosystem.`,
        data: { state, tasks, providers, ratio },
      });
    }

    this.logger.warn(
      `Supply/Demand Imbalance: ${state}. Tasks=${tasks}, Providers=${providers}, Ratio=${ratio}.`,
    );
  }
}
