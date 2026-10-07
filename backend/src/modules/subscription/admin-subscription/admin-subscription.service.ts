import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { getPagination } from 'src/common/utils/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

@Injectable()
export class AdminSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: AwsS3Service,
  ) {}

  async findAllSubscriptions(page = 1, limit = 10) {
    limit = Math.min(limit, 50);

    const totalItems = await this.prisma.subscription.count();

    const { skip, take, meta } = getPagination(page, limit, totalItems);

    const [
      subscriptions,

      activeSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      pendingSubscriptions,
      activeRevenueSubscriptions,
    ] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        skip,
        take,

        orderBy: {
          createdAt: 'desc',
        },

        select: {
          id: true,
          userId: true,
          planId: true,
          status: true,
          startDate: true,
          endDate: true,
          autoRenew: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageKey: true,
              role: true,
              status: true,
            },
          },
          plan: {
            select: {
              id: true,
              tier: true,
              name: true,
              description: true,
              price: true,
              credit: true,
              visibility: true,
              billingInterval: true,
              features: true,
            },
          },
        },
      }),

      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
        },
      }),

      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.CANCELLED,
        },
      }),

      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.EXPIRED,
        },
      }),

      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.PENDING,
        },
      }),

      this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
        },
        select: {
          plan: {
            select: {
              price: true,
            },
          },
        },
      }),
    ]);

    const totalRevenue = activeRevenueSubscriptions.reduce(
      (sum, subscription) => sum + Number(subscription.plan.price),
      0,
    );

    const data = await Promise.all(
      subscriptions.map(async (subscription) => {
        let imageUrl: string | null = null;

        if (subscription.user.imageKey) {
          imageUrl = (await this.s3.getDownloadUrl(subscription.user.imageKey))
            .downloadUrl;
        }

        const { imageKey, ...user } = subscription.user;

        return {
          ...subscription,

          user: {
            ...user,
            imageUrl,
          },
        };
      }),
    );

    return sendResponse('Subscriptions fetched successfully', {
      data,
      meta,
      analytics: {
        totalSubscriptions: totalItems,
        activeSubscriptions,
        cancelledSubscriptions,
        expiredSubscriptions,
        pendingSubscriptions,

        totalRevenue,
      },
    });
  }
}
