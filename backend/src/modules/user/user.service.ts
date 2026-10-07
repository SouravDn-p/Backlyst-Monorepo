import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { UpdateWebsiteDefaultsDto } from './dto/update-website-defaults.dto';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: AwsS3Service,
  ) {}

  private async mapTaskWithResolvedFiles<T extends Record<string, any>>(
    task: T,
  ) {
    if (!task) {
      return task;
    }

    const supportDocumentKeys = Array.isArray(task.supportDocuments)
      ? task.supportDocuments.filter(
          (value: unknown): value is string =>
            typeof value === 'string' && value.trim().length > 0,
        )
      : [];
    const providerProofDocumentKeys = Array.isArray(task.providerProofDocuments)
      ? task.providerProofDocuments.filter(
          (value: unknown): value is string =>
            typeof value === 'string' && value.trim().length > 0,
        )
      : [];

    const [supportDocumentUrls, providerProofDocumentUrls] = await Promise.all([
      this.s3.resolveFileUrls(supportDocumentKeys),
      this.s3.resolveFileUrls(providerProofDocumentKeys),
    ]);

    return {
      ...task,
      supportDocumentKeys,
      supportDocuments: supportDocumentUrls,
      supportDocumentUrls,
      providerProofDocumentKeys,
      providerProofDocuments: providerProofDocumentUrls,
      providerProofDocumentUrls,
    };
  }
  async updateProfile(userId: string, data: UpdateUserDto = {}) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isDeleted: true,
        status: true,
        imageKey: true,
        imageUrl: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('User is not active');
    }

    const { newPassword, imageKey, ...profileData } = data;
    let newImageKey: string | undefined;

    const trimmedImageKey = imageKey?.trim();
    if (trimmedImageKey) {
      if (!trimmedImageKey.startsWith('user/')) {
        throw new BadRequestException('Invalid image key');
      }

      newImageKey = trimmedImageKey;

      if (user.imageKey && user.imageKey !== trimmedImageKey) {
        try {
          await this.s3.deleteFileFromS3(user.imageKey);
        } catch (error) {
          this.logger.warn(
            `Old profile image cleanup failed for user ${userId}. The profile image was still updated.`,
          );
          this.logger.warn(
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    const cleanData: Prisma.UserUpdateInput = Object.fromEntries(
      Object.entries(profileData).filter(
        ([_, value]) => value !== undefined && value !== null,
      ),
    );

    if (newPassword) {
      cleanData.password = await bcrypt.hash(newPassword, 10);
      cleanData.lastPasswordChangeTime = new Date();
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...cleanData,
        ...(newImageKey ? { imageKey: newImageKey, imageUrl: null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        country: true,
        companyName: true,
        companyWebsite: true,
        companyIndustry: true,
        businessType: true,
        vatUid: true,
        imageKey: true,
        imageUrl: true,
        status: true,
        role: true,
        notificationTaskStatusUpdates: true,
        notificationCreditBalanceAlerts: true,
        notificationDisputeReviewNotifications: true,
        notificationSystemAnnouncements: true,
        registrationTime: true,
        lastPasswordChangeTime: true,
      },
    });

    const signedImageUrl = await this.s3.resolveFileUrl(
      updatedUser.imageKey ?? updatedUser.imageUrl,
    );

    return sendResponse('Profile Updated Successfully', {
      ...updatedUser,
      imageUrl: signedImageUrl,
    });
  }

  async deleteMyselfAccount(id: string) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!isUserExist || isUserExist.isDeleted) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return sendResponse('Your Account Deleted Successfully');
  }

  async updateNotificationPreferences(
    userId: string,
    data: UpdateNotificationPreferencesDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isDeleted: true,
        status: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('User is not active');
    }

    const cleanData: Prisma.UserUpdateInput = Object.fromEntries(
      Object.entries(data).filter(
        ([_, value]) => value !== undefined && value !== null,
      ),
    );

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: cleanData,
      select: {
        id: true,
        notificationTaskStatusUpdates: true,
        notificationCreditBalanceAlerts: true,
        notificationDisputeReviewNotifications: true,
        notificationSystemAnnouncements: true,
      },
    });

    return sendResponse(
      'Notification preferences updated successfully',
      updatedUser,
    );
  }

  async updateWebsiteDefaults(userId: string, data: UpdateWebsiteDefaultsDto) {
    if (
      data.taskAutoAcceptTasks !== undefined &&
      data.taskManualReviewRequired !== undefined
    ) {
      throw new BadRequestException(
        'Send either taskAutoAcceptTasks or taskManualReviewRequired, not both',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isDeleted: true,
        status: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('User is not active');
    }

    const cleanData: Prisma.UserUpdateInput = Object.fromEntries(
      Object.entries(data).filter(
        ([_, value]) => value !== undefined && value !== null,
      ),
    );

    if (data.taskAutoAcceptTasks === true) {
      cleanData.taskManualReviewRequired = false;
    }

    if (data.taskManualReviewRequired === true) {
      cleanData.taskAutoAcceptTasks = false;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: cleanData,
      select: {
        id: true,
        taskAutoAcceptTasks: true,
        taskManualReviewRequired: true,
      },
    });

    return sendResponse('Website defaults updated successfully', updatedUser);
  }

  async findSingleUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        imageKey: true,
        imageUrl: true,
        status: true,
        role: true,
        notificationTaskStatusUpdates: true,
        notificationCreditBalanceAlerts: true,
        notificationDisputeReviewNotifications: true,
        notificationSystemAnnouncements: true,
        taskAutoAcceptTasks: true,
        taskManualReviewRequired: true,

        registrationTime: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('User is not active');
    }

    const signedImageUrl = await this.s3.resolveFileUrl(
      user.imageKey ?? user.imageUrl,
    );

    return sendResponse('User fetched successfully', {
      ...user,
      imageUrl: signedImageUrl,
    });
  }

  async exportMyData(userId: string) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 10);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        isReferralEnabled: true,
        role: true,
        companyName: true,
        companyWebsite: true,
        companyIndustry: true,
        businessType: true,
        country: true,
        phoneNumber: true,
        vatUid: true,
        notificationTaskStatusUpdates: true,
        notificationCreditBalanceAlerts: true,
        notificationDisputeReviewNotifications: true,
        notificationSystemAnnouncements: true,
        taskAutoAcceptTasks: true,
        taskManualReviewRequired: true,
        registrationTime: true,
        lastPasswordChangeTime: true,
        isVerified: true,
        status: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
      throw new NotFoundException('User not found');
    }

    const [
      sessions,
      websites,
      creditWallet,
      creditLogs,
      subscriptions,
      referralsSent,
      referralsReceived,

      requesterTasks,
      requesterTaskFlows,

      providerApplications,
      providerSelectedTasks,
      providerTaskFlows,

      legalAcceptances,
    ] = await this.prisma.$transaction([
      this.prisma.session.findMany({
        where: {
          userId,
          loginAt: { gte: fromDate },
        },
        orderBy: { loginAt: 'desc' },
        take: 50,
        select: {
          id: true,
          device: true,
          ipAddress: true,
          userAgent: true,
          loginAt: true,
          logoutAt: true,
        },
      }),

      this.prisma.website.findMany({
        where: { authorId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        select: {
          id: true,
          name: true,
          websiteUrl: true,
          industry: true,
          country: true,
          isDeleted: true,
          verificationStatus: true,
          verifiedAt: true,
          verifiedMethod: true,
          createdAt: true,
          updatedAt: true,
          creditWallet: true,
          milestoneProgress: true,
          activityStreak: true,
        },
      }),

      this.prisma.userCreditWallet.findUnique({
        where: { userId },
        select: {
          id: true,
          subscriptionTaskCredits: true,
          earnedTaskCredits: true,
          purchasedTaskCredits: true,
          referralTaskCredits: true,
          visibilityCredits: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      this.prisma.creditLog.findMany({
        where: {
          userId,
          createdAt: { gte: fromDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
        select: {
          id: true,
          creditType: true,
          action: true,
          reason: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          websiteId: true,
          taskId: true,
          referralId: true,
          subscriptionId: true,
          subscriptionCreditBatchId: true,
          note: true,
          createdAt: true,
        },
      }),

      this.prisma.subscription.findMany({
        where: {
          userId,
          OR: [
            { status: 'ACTIVE' },
            { createdAt: { gte: fromDate } },
            { updatedAt: { gte: fromDate } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          planId: true,
          status: true,
          startDate: true,
          endDate: true,
          autoRenew: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,
          plan: {
            select: {
              id: true,
              tier: true,
              name: true,
              price: true,
              credit: true,
              taskCreditsPerCycle: true,
              maxTaskCreditCapacity: true,
              billingInterval: true,
              visibility: true,
              features: true,
              badges: true,
            },
          },
        },
      }),

      this.prisma.userReferral.findMany({
        where: {
          referrerUserId: userId,
          updatedAt: { gte: fromDate },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          codeUsed: true,
          currentStage: true,
          signedUpAt: true,
          websiteVerifiedAt: true,
          firstBacklinkAt: true,
          paidSubscriptionAt: true,
          createdAt: true,
          updatedAt: true,
          referredUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          referredWebsite: {
            select: {
              id: true,
              name: true,
              websiteUrl: true,
              verificationStatus: true,
            },
          },
          rewards: true,
        },
      }),

      this.prisma.userReferral.findMany({
        where: {
          referredUserId: userId,
          updatedAt: { gte: fromDate },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          codeUsed: true,
          currentStage: true,
          signedUpAt: true,
          websiteVerifiedAt: true,
          firstBacklinkAt: true,
          paidSubscriptionAt: true,
          createdAt: true,
          updatedAt: true,
          referrerUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          referredWebsite: {
            select: {
              id: true,
              name: true,
              websiteUrl: true,
              verificationStatus: true,
            },
          },
          rewards: true,
        },
      }),

      this.prisma.placementTask.findMany({
        where: {
          requesterId: userId,
          updatedAt: { gte: fromDate },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          requesterId: true,
          requesterWebsiteId: true,

          selectedProviderId: true,
          selectedApplicationId: true,
          assignedProviderWebsiteId: true,

          projectTitle: true,
          targetUrl: true,
          anchorText: true,
          placementGuidelines: true,
          requiredDomainRating: true,

          placementType: true,
          linkAttribute: true,
          responsibilityType: true,

          requestedDeadlineDays: true,
          deliveryDeadline: true,
          deadlineExtensionCount: true,
          deadlineExtendedDaysTotal: true,
          deadlineLastExtendedAt: true,
          isLate: true,
          lateAt: true,

          lifecycleStatus: true,
          submissionStatus: true,

          creditCost: true,
          reservedCreditAmount: true,
          walletType: true,
          finalTaskType: true,
          finalCreditCost: true,
          providerRewardCredits: true,
          completionRewardedAt: true,

          cancellationRequestStatus: true,
          cancellationRequestedById: true,
          cancellationRequestedAt: true,
          cancellationRespondedAt: true,

          publishedAt: true,
          assignedAt: true,
          submittedAt: true,
          approvedAt: true,
          completedAt: true,
          cancelledAt: true,
          expiredAt: true,
          frozenAt: true,

          supportDocuments: true,
          providerProofDocuments: true,

          createdAt: true,
          updatedAt: true,

          selectedProvider: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },

          placementApplications: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              providerId: true,
              providerWebsiteId: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              provider: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },

          deadlineExtensions: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              requestedById: true,
              previousDeadline: true,
              newDeadline: true,
              extendDays: true,
              reason: true,
              createdAt: true,
            },
          },

          creditLogs: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              creditType: true,
              action: true,
              reason: true,
              amount: true,
              balanceBefore: true,
              balanceAfter: true,
              websiteId: true,
              note: true,
              createdAt: true,
            },
          },
        },
      }),

      this.prisma.taskFlow.findMany({
        where: {
          requesterId: userId,
          createdAt: { gte: fromDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
        select: {
          id: true,
          placementTaskId: true,
          providerId: true,
          actorId: true,
          requesterWebsiteId: true,
          providerWebsiteId: true,
          eventType: true,
          actorRole: true,
          fromStatus: true,
          toStatus: true,
          actionTaken: true,
          note: true,
          metadata: true,
          createdAt: true,
        },
      }),

      this.prisma.placementApplication.findMany({
        where: {
          providerId: userId,
          updatedAt: { gte: fromDate },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          providerId: true,
          providerWebsiteId: true,
          placementTaskId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          placementTask: {
            select: {
              id: true,
              requesterId: true,
              requesterWebsiteId: true,
              selectedProviderId: true,
              selectedApplicationId: true,
              assignedProviderWebsiteId: true,

              projectTitle: true,
              targetUrl: true,
              anchorText: true,
              placementGuidelines: true,
              requiredDomainRating: true,

              placementType: true,
              linkAttribute: true,
              responsibilityType: true,

              requestedDeadlineDays: true,
              deliveryDeadline: true,
              isLate: true,
              lateAt: true,

              lifecycleStatus: true,
              submissionStatus: true,

              creditCost: true,
              reservedCreditAmount: true,
              walletType: true,
              finalTaskType: true,
              finalCreditCost: true,
              providerRewardCredits: true,
              completionRewardedAt: true,

              publishedAt: true,
              assignedAt: true,
              submittedAt: true,
              approvedAt: true,
              completedAt: true,
              cancelledAt: true,
              expiredAt: true,
              frozenAt: true,

              supportDocuments: true,
              providerProofDocuments: true,

              createdAt: true,
              updatedAt: true,

              requester: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.placementTask.findMany({
        where: {
          selectedProviderId: userId,
          updatedAt: { gte: fromDate },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          requesterId: true,
          requesterWebsiteId: true,
          selectedProviderId: true,
          selectedApplicationId: true,
          assignedProviderWebsiteId: true,

          projectTitle: true,
          targetUrl: true,
          anchorText: true,
          placementGuidelines: true,
          requiredDomainRating: true,

          placementType: true,
          linkAttribute: true,
          responsibilityType: true,

          requestedDeadlineDays: true,
          deliveryDeadline: true,
          deadlineExtensionCount: true,
          deadlineExtendedDaysTotal: true,
          deadlineLastExtendedAt: true,
          isLate: true,
          lateAt: true,

          lifecycleStatus: true,
          submissionStatus: true,

          creditCost: true,
          reservedCreditAmount: true,
          walletType: true,
          finalTaskType: true,
          finalCreditCost: true,
          providerRewardCredits: true,
          completionRewardedAt: true,

          cancellationRequestStatus: true,
          cancellationRequestedById: true,
          cancellationRequestedAt: true,
          cancellationRespondedAt: true,

          publishedAt: true,
          assignedAt: true,
          submittedAt: true,
          approvedAt: true,
          completedAt: true,
          cancelledAt: true,
          expiredAt: true,
          frozenAt: true,

          supportDocuments: true,
          providerProofDocuments: true,

          createdAt: true,
          updatedAt: true,

          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          placementApplications: {
            where: { providerId: userId },
            select: {
              id: true,
              providerId: true,
              providerWebsiteId: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          deadlineExtensions: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              requestedById: true,
              previousDeadline: true,
              newDeadline: true,
              extendDays: true,
              reason: true,
              createdAt: true,
            },
          },

          verifiedPlacement: true,

          creditLogs: {
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              creditType: true,
              action: true,
              reason: true,
              amount: true,
              balanceBefore: true,
              balanceAfter: true,
              websiteId: true,
              note: true,
              createdAt: true,
            },
          },
        },
      }),

      this.prisma.taskFlow.findMany({
        where: {
          OR: [{ providerId: userId }, { actorId: userId }],
          createdAt: { gte: fromDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
        select: {
          id: true,
          placementTaskId: true,
          requesterId: true,
          providerId: true,
          actorId: true,
          requesterWebsiteId: true,
          providerWebsiteId: true,
          eventType: true,
          actorRole: true,
          fromStatus: true,
          toStatus: true,
          actionTaken: true,
          note: true,
          metadata: true,
          createdAt: true,
        },
      }),

      this.prisma.userLegalAcceptance.findMany({
        where: {
          userId,
          acceptedAt: { gte: fromDate },
        },
        orderBy: { acceptedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          acceptedAt: true,
          version: {
            select: {
              id: true,
              version: true,
              publishedAt: true,
              document: {
                select: {
                  id: true,
                  type: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return sendResponse('User data exported successfully', {
      exportedAt: new Date(),
      range: {
        from: fromDate,
        to: new Date(),
        days: 10,
      },

      user,

      account: {
        sessions,
        websites,
        legalAcceptances,
      },

      credits: {
        wallet: creditWallet,
        recentLogs: creditLogs,
      },

      subscriptions,

      referrals: {
        sent: referralsSent,
        received: referralsReceived,
      },

      requesterDashboard: {
        tasks: requesterTasks,
        taskFlows: requesterTaskFlows,
      },

      providerDashboard: {
        applications: providerApplications,
        selectedTasks: providerSelectedTasks,
        taskFlows: providerTaskFlows,
      },
    });
  }
}
