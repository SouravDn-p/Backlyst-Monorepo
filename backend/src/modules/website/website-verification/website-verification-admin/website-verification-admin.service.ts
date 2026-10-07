import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ApproveWebsiteScreenshotVerificationDto,
  RejectWebsiteScreenshotVerificationDto,
} from './dto/verification-response.dto';
import { sendResponse } from 'src/utils/sendResponse';
import {
  NotificationCategory,
  NotificationEntityType,
  NotificationType,
  Prisma,
  WebsiteVerificationStatus,
  WebsiteVerificationType,
} from '@prisma/client';
import { MailService } from 'src/common/utils/mail/mail.service';
import { AddWebsiteVerificationMetaTagDto } from './dto/add-verification-meta-tag.dto';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { ReferrerService } from 'src/modules/credit/referrer/referrer.service';
import { NotificationService } from 'src/modules/notification/notification.service';

const WEBSITE_VERIFICATION_CONFIG_ID = 'WEBSITE_VERIFICATION_CONFIG';

@Injectable()
export class WebsiteVerificationAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly s3: AwsS3Service,
    private readonly referrerService: ReferrerService,
    private readonly notificationService: NotificationService,
  ) {}

  async manualApproveWebsiteVerificationRequest(
    userId: string,
    payload: ApproveWebsiteScreenshotVerificationDto,
  ) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const website = await tx.website.findUnique({
          where: {
            id: payload.websiteId,
          },
          select: {
            verificationStatus: true,
          },
        });

        if (!website) {
          throw new NotFoundException('Website not found');
        }

        if (website.verificationStatus === 'VERIFIED') {
          throw new BadRequestException('Website is already verified');
        }

        const existingVerification = await tx.websiteVerification.findFirst({
          where: {
            websiteId: payload.websiteId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
          },
        });

        if (!existingVerification) {
          throw new BadRequestException('Verification record not found');
        }

        const verification = await tx.websiteVerification.update({
          where: {
            id: existingVerification.id,
          },
          data: {
            status: 'VERIFIED',
            verifiedBy: 'MANUAL_BY_ADMIN',
            manuallyReviewedByAdminUserId: userId,
            manualReviewNotes: payload.manualReviewNotes,
          },
          select: {
            id: true,
            websiteId: true,
            type: true,
            website: {
              select: {
                name: true,
                websiteUrl: true,
                author: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        await tx.website.update({
          where: {
            id: verification.websiteId,
          },
          data: {
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(),
            verifiedMethod: verification.type,
            latestVerificationId: verification.id,
          },
        });
        //////added by imran//
        await tx.websiteMatchingProfile.upsert({
          where: { websiteId: verification.websiteId },
          update: {},
          create: {
            websiteId: verification.websiteId,
            userId: verification.website.author.id,
            visibilityScore: 50,
            opportunityScore: 50,
            reputationScore: 50,
            internalPriorityScore: 50,
            reliabilityScore: 50,
            riskScore: 0,
            diversityScore: 50,
            firstSuccessBoostActive: true,
          },
        });
        ///finish/////
        // Referral credit purpose: website verification unlocks Stage 1 referral rewards in the same transaction.
        await this.referrerService.unlockWebsiteVerifiedStage(
          verification.website.author.id,
          verification.websiteId,
          tx,
        );

        return verification;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );

    this.mail.sendWebsiteApprovedEmail(result.website.author.email, {
      ownerName: result.website.author.name,
      websiteName: result.website.name,
      websiteUrl: result.website.websiteUrl,
      manualReviewNotes: payload.manualReviewNotes,
    });

    await this.sendWebsiteVerificationNotification({
      recipientId: result.website.author.id,
      actorId: userId,
      websiteId: result.websiteId,
      verificationId: result.id,
      type: NotificationType.WEBSITE_VERIFIED,
      title: 'Website verified',
      body: `${result.website.name} has been verified successfully.`,
      data: {
        websiteName: result.website.name,
        websiteUrl: result.website.websiteUrl,
        manualReviewNotes: payload.manualReviewNotes ?? null,
      },
      idempotencyKey: `website-verified-${result.id}`,
    });

    return sendResponse('Website verification approved successfully', {
      websiteVerificationId: result.id,
      websiteId: result.websiteId,
    });
  }

  
  async rejectWebsiteVerificationRequest(
    userId: string,
    payload: RejectWebsiteScreenshotVerificationDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const website = await tx.website.findUnique({
        where: {
          id: payload.websiteId,
        },
        select: {
          verificationStatus: true,
        },
      });

      if (!website) {
        throw new NotFoundException('Website not found');
      }

      if (website.verificationStatus === 'REJECTED') {
        throw new BadRequestException('Website is already rejected');
      }

      const verification = await tx.websiteVerification.findFirst({
        where: {
          websiteId: payload.websiteId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          websiteId: true,
          website: {
            select: {
              name: true,
              websiteUrl: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!verification) {
        throw new BadRequestException('Verification record not found');
      }

      await tx.websiteVerification.update({
        where: {
          id: verification.id,
        },
        data: {
          status: 'REJECTED',
          verifiedBy: 'MANUAL_BY_ADMIN',
          manuallyReviewedByAdminUserId: userId,
          manualReviewNotes: payload.manualReviewNotes,
          rejectReason: payload.rejectionReason,
        },
      });

      await tx.website.update({
        where: {
          id: verification.websiteId,
        },
        data: {
          verificationStatus: 'REJECTED',
          latestVerificationId: verification.id,
        },
      });

      return verification;
    });

    // ✅ email uses DB data (same style as approve)
    this.mail.sendWebsiteRejectedEmail(result.website.author.email, {
      ownerName: result.website.author.name,
      websiteName: result.website.name,
      websiteUrl: result.website.websiteUrl,
      rejectionReason: payload.rejectionReason,
      manualReviewNotes: payload.manualReviewNotes,
    });

    await this.sendWebsiteVerificationNotification({
      recipientId: result.website.author.id,
      actorId: userId,
      websiteId: result.websiteId,
      verificationId: result.id,
      type: NotificationType.WEBSITE_REJECTED,
      title: 'Website verification rejected',
      body: `${result.website.name} verification was rejected.`,
      data: {
        websiteName: result.website.name,
        websiteUrl: result.website.websiteUrl,
        rejectionReason: payload.rejectionReason,
        manualReviewNotes: payload.manualReviewNotes ?? null,
      },
      idempotencyKey: `website-rejected-${result.id}`,
    });

    return sendResponse('Website verification rejected successfully', {
      websiteVerificationId: result.id,
      websiteId: result.websiteId,
    });
  }

  async getAllWebsiteVerificationRequests(
    search?: string,
    page = 1,
    limit = 10,
    filter?: {
      type?: WebsiteVerificationType;
      status?: WebsiteVerificationStatus;
    },
  ) {
    const skip = (page - 1) * limit;

    // 🔹 Base filter (admin scope)
    const baseWhere: Prisma.WebsiteVerificationWhereInput = {};

    // 🔹 Full filter (base + optional filters)
    const where: Prisma.WebsiteVerificationWhereInput = {
      ...baseWhere,
      ...(filter?.type && { type: filter.type }),
      ...(filter?.status && { status: filter.status }),
    };

    // 🔹 Search (applies on top of filters)
    if (search) {
      where.OR = [
        {
          website: {
            industry: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          website: {
            websiteUrl: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          website: {
            country: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          website: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.websiteVerification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          website: {
            include: {
              author: true,
            },
          },
          manuallyReviewedByAdmin: true,
        },
      }),

      // ✅ must match SAME filters as data
      this.prisma.websiteVerification.count({
        where,
      }),
    ]);

    return sendResponse('All website ', {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async seeVerificationDetails(verificationId: string) {
    const verification = await this.prisma.websiteVerification.findUnique({
      where: { id: verificationId },

      select: {
        id: true,
        createdAt: true,

        websiteId: true,

        status: true,
        type: true,

        screenshotImageKey: true,

        verifiedBy: true,

        errorMessage: true,
        responseData: true,

        rejectReason: true,
        manualReviewNotes: true,

        website: {
          select: {
            id: true,
            name: true,

            logoKey: true, // 👈 important

            websiteUrl: true,

            verificationStatus: true,
            verifiedAt: true,
            verifiedMethod: true,

            industry: true,
            country: true,

            author: {
              select: {
                id: true,
                name: true,
                email: true,
                imageKey: true,
              },
            },
          },
        },

        manuallyReviewedByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
            imageKey: true,
          },
        },
      },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    const [screenshotUrl, logoUrl, authorImageUrl, adminImageUrl] =
      await Promise.all([
        verification.type === WebsiteVerificationType.SCREENSHOT_URL &&
        verification.screenshotImageKey
          ? this.s3
              .getDownloadUrl(verification.screenshotImageKey)
              .then((r) => r.downloadUrl)
          : null,

        verification.website?.logoKey
          ? this.s3
              .getDownloadUrl(verification.website.logoKey)
              .then((r) => r.downloadUrl)
          : null,

        verification.website?.author?.imageKey
          ? this.s3
              .getDownloadUrl(verification.website.author.imageKey)
              .then((r) => r.downloadUrl)
          : null,

        verification.manuallyReviewedByAdmin?.imageKey
          ? this.s3
              .getDownloadUrl(verification.manuallyReviewedByAdmin.imageKey)
              .then((r) => r.downloadUrl)
          : null,
      ]);

    const { screenshotImageKey, manuallyReviewedByAdmin, website, ...rest } =
      verification;

    return {
      ...rest,

      screenshotUrl,

      website: {
        ...website,

        logoUrl, // 👈 added

        author: website.author
          ? {
              ...website.author,
              imageUrl: authorImageUrl,
            }
          : null,
      },

      manuallyReviewedByAdmin: manuallyReviewedByAdmin
        ? {
            ...manuallyReviewedByAdmin,
            imageUrl: adminImageUrl,
          }
        : null,
    };
  }

  async addOrUpdateVerificationMetaTag(
    payload: AddWebsiteVerificationMetaTagDto,
  ) {
    const result = await this.prisma.websiteVerificationConfig.upsert({
      where: {
        id: WEBSITE_VERIFICATION_CONFIG_ID,
      },
      update: {
        metaName: payload.metaName,
        verificationToken: payload.verificationToken,
      },
      create: {
        id: WEBSITE_VERIFICATION_CONFIG_ID,
        metaName: payload.metaName,
        verificationToken: payload.verificationToken,
      },
    });

    return sendResponse('Meta tag added/updated successfully', {
      metaName: result.metaName,
      verificationToken: result.verificationToken,
    });
  }

  async getVerificationMetaTag() {
    let result = await this.prisma.websiteVerificationConfig.findUnique({
      where: { id: WEBSITE_VERIFICATION_CONFIG_ID },
    });

    if (!result) {
      result = await this.prisma.websiteVerificationConfig.create({
        data: {
          id: WEBSITE_VERIFICATION_CONFIG_ID,
          metaName: 'backlyst-verification',
          verificationToken: 'b1_9a2f1b8415412',
        },
      });
    }

    return sendResponse('Meta tag fetched successfully', {
      metaName: result.metaName,
      verificationToken: result.verificationToken,
    });
  }
  async forceWebsiteReverification(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        authorId: true,
        name: true,
        websiteUrl: true,
        isDeleted: true,
        verificationStatus: true,
        verifiedAt: true,
        verifiedMethod: true,
        latestVerificationId: true,
      },
    });

    if (!website || website.isDeleted) {
      throw new NotFoundException('Website not found');
    }

    if (website.verificationStatus === 'PENDING') {
      throw new BadRequestException('Website already requires verification');
    }

    const updatedWebsite = await this.prisma.website.update({
      where: { id: websiteId },
      data: {
        verificationStatus: 'PENDING',
        verifiedAt: null,
        verifiedMethod: null,
        latestVerificationId: null,
      },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        verificationStatus: true,
        verifiedAt: true,
        verifiedMethod: true,
        latestVerificationId: true,
      },
    });

    await this.sendWebsiteVerificationNotification({
      recipientId: website.authorId,
      actorId: null,
      websiteId,
      verificationId: website.latestVerificationId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Website re-verification required',
      body: `${website.name} must be verified again before full marketplace participation.`,
      data: {
        websiteName: website.name,
        websiteUrl: website.websiteUrl,
        previousStatus: website.verificationStatus,
      },
      idempotencyKey: `website-reverification-required-${websiteId}-${website.latestVerificationId ?? 'none'}`,
    });

    return sendResponse('Website marked for re-verification successfully', {
      website: updatedWebsite,
      previousVerification: {
        status: website.verificationStatus,
        verifiedAt: website.verifiedAt,
        verifiedMethod: website.verifiedMethod,
        latestVerificationId: website.latestVerificationId,
      },
    });
  }

  private async sendWebsiteVerificationNotification(input: {
    recipientId: string;
    actorId?: string | null;
    websiteId: string;
    verificationId?: string | null;
    type: NotificationType;
    title: string;
    body: string;
    data: Record<string, unknown>;
    idempotencyKey: string;
  }) {
    try {
      await this.notificationService.sendNotification({
        recipientId: input.recipientId,
        actorId: input.actorId ?? null,
        type: input.type,
        category: NotificationCategory.SECURITY,
        entityType: NotificationEntityType.WEBSITE,
        entityId: input.websiteId,
        title: input.title,
        body: input.body,
        data: {
          websiteId: input.websiteId,
          verificationId: input.verificationId ?? null,
          ...input.data,
        },
        idempotencyKey: input.idempotencyKey,
      });
    } catch {
      // Verification status/email is the source of truth; notification failure
      // must not block admin verification actions.
    }
  }
}
