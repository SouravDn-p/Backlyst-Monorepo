import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerifyWebsiteByScreenshotDto } from './dto/website-verification.dto';
import { sendResponse } from 'src/utils/sendResponse';
import { ApiTags } from '@nestjs/swagger';
import {
  Prisma,
  WebsiteVerificationStatus,
  WebsiteVerificationType,
} from '@prisma/client';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';

const WEBSITE_VERIFICATION_CONFIG_ID = 'WEBSITE_VERIFICATION_CONFIG';

@ApiTags('Website Verification')
@Injectable()
export class WebsiteVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: AwsS3Service,
  ) {}

  async requestScreenshotVerification(
    userId: string,
    payload: VerifyWebsiteByScreenshotDto,
  ) {
    const screenshotImageKey = payload.screenshotImageKey?.trim();
    if (!screenshotImageKey) {
      throw new BadRequestException('screenshotImageKey is required');
    }

    return await this.prisma.$transaction(async (tx) => {
      const website = await tx.website.findUnique({
        where: { id: payload.websiteId },
        select: {
          id: true,
          authorId: true,
          verificationStatus: true,
          isDeleted: true,
        },
      });

      if (!website || website.isDeleted) {
        throw new NotFoundException('Website not found');
      }

      if (website.authorId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to verify this website',
        );
      }

      if (website.verificationStatus === 'VERIFIED') {
        throw new BadRequestException('Website already verified');
      }

      const existingRequest = await tx.websiteVerification.findFirst({
        where: {
          websiteId: website.id,
          type: 'SCREENSHOT_URL',
          status: {
            in: ['PENDING', 'REQUESTED_FOR_MANUAL_REVIEW'],
          },
        },
        select: {
          id: true,
        },
      });

      if (existingRequest) {
        throw new BadRequestException(
          'A verification request is already pending',
        );
      }

      const verification = await tx.websiteVerification.create({
        data: {
          websiteId: website.id,
          type: 'SCREENSHOT_URL',
          status: 'REQUESTED_FOR_MANUAL_REVIEW',
          screenshotImageKey,
          requestedByUserId: userId,
        },
      });

      await tx.website.update({
        where: { id: website.id },
        data: {
          verificationStatus: 'PENDING',
          latestVerificationId: verification.id,
        },
      });

      return sendResponse('Screenshot verification submitted for review', {
        websiteId: website.id,
        websiteVerificationId: verification.id,
      });
    });
  }

  async seeVerificationDetails(verificationId: string, userId: string) {
    const verification = await this.prisma.websiteVerification.findFirst({
      where: {
        id: verificationId,
        requestedByUserId: userId,
      },

      select: {
        id: true,
        createdAt: true,
        websiteId: true,
        status: true,
        type: true,
        screenshotImageKey: true,
        rejectReason: true,
        website: {
          select: {
            id: true,
            name: true,
            logoKey: true,
            websiteUrl: true,
            verificationStatus: true,
            verifiedAt: true,
            verifiedMethod: true,
          },
        },
      },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    const [screenshotUrl, logoUrl] = await Promise.all([
      verification.screenshotImageKey
        ? this.s3
            .getDownloadUrl(verification.screenshotImageKey)
            .then((r) => r.downloadUrl)
        : null,

      verification.website.logoKey
        ? this.s3
            .getDownloadUrl(verification.website.logoKey)
            .then((r) => r.downloadUrl)
        : null,
    ]);

    const { screenshotImageKey, website, ...rest } = verification;

    return {
      ...rest,

      screenshotUrl,

      website: {
        ...website,
        logoUrl,
      },
    };
  }

  async getMyVerificationRequests(
    userId: string,
    search?: string,
    page = 1,
    limit = 10,
    filter?: {
      type?: WebsiteVerificationType;
      status?: WebsiteVerificationStatus;
    },
  ) {
    limit = Math.min(limit, 50);

    const skip = (page - 1) * limit;

    const normalizedSearch = search?.trim();

    const baseWhere: Prisma.WebsiteVerificationWhereInput = {
      requestedByUserId: userId,
    };

    const filteredWhere: Prisma.WebsiteVerificationWhereInput = {
      ...baseWhere,

      ...(filter?.type && { type: filter.type }),
      ...(filter?.status && {
        status: filter.status,
      }),

      ...(normalizedSearch && {
        OR: [
          {
            website: {
              name: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
          },
          {
            website: {
              websiteUrl: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
          },
        ],
      }),
    };

    const [verifications, filteredCount, totalCount] =
      await this.prisma.$transaction([
        this.prisma.websiteVerification.findMany({
          where: filteredWhere,

          skip,
          take: limit,

          orderBy: {
            createdAt: 'desc',
          },

          select: {
            id: true,
            status: true,
            type: true,
            createdAt: true,
            screenshotImageKey: true,
            website: {
              select: {
                id: true,
                name: true,
                websiteUrl: true,
                logoKey: true,
                verificationStatus: true,
                verifiedMethod: true,
              },
            },
          },
        }),

        this.prisma.websiteVerification.count({
          where: filteredWhere,
        }),

        this.prisma.websiteVerification.count({
          where: baseWhere,
        }),
      ]);

    // ✅ batch resolve all assets in parallel
    const data = await Promise.all(
      verifications.map(async (v) => {
        const [screenshotUrl, logoUrl] = await Promise.all([
          v.screenshotImageKey
            ? this.s3
                .getDownloadUrl(v.screenshotImageKey)
                .then((r) => r.downloadUrl)
            : null,

          v.website?.logoKey
            ? this.s3
                .getDownloadUrl(v.website.logoKey)
                .then((r) => r.downloadUrl)
            : null,
        ]);

        const { screenshotImageKey, website, ...rest } = v;

        return {
          ...rest,

          screenshotUrl,

          website: {
            ...website,
            logoUrl,
          },
        };
      }),
    );

    return sendResponse('Verification requests fetched successfully', {
      data,

      meta: {
        page,
        limit,
        filteredCount,
        totalCount,
        totalPages: Math.ceil(filteredCount / limit),
        hasNextPage: page * limit < filteredCount,
        hasPreviousPage: page > 1,
      },
    });
  }

  async getMetaTags() {
    const data = await this.prisma.websiteVerificationConfig.findUnique({
      where: { id: WEBSITE_VERIFICATION_CONFIG_ID },
    });

    if (!data) {
      throw new NotFoundException('Meta tag not found');
    }

    const result = {
      metaTag: `<meta name="${data.metaName}" content="${data.verificationToken}" />`,
      dnsTxt: `${data.metaName}=${data.verificationToken}`,
    };

    return sendResponse('Meta tags fetched successfully', result);
  }

  private extractMetaTagValue(
    type: 'HTML' | 'DNS',
    value: string,
  ): {
    metaName: string;
    verificationToken: string;
  } {
    if (type === 'DNS') {
      const [metaName, verificationToken] = value.split('=');

      if (!metaName || !verificationToken) {
        throw new Error('Invalid DNS verification format');
      }

      return {
        metaName: metaName.trim(),
        verificationToken: verificationToken.trim(),
      };
    }

    if (type === 'HTML') {
      const nameMatch = value.match(/name="([^"]+)"/);
      const contentMatch = value.match(/content="([^"]+)"/);

      if (!nameMatch || !contentMatch) {
        throw new Error('Invalid HTML meta tag format');
      }

      return {
        metaName: nameMatch[1].trim(),
        verificationToken: contentMatch[1].trim(),
      };
    }

    throw new BadRequestException('Unsupported verification type');
  }

  async requestManualReview(userId: string, websiteId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const website = await tx.website.findUnique({
        where: { id: websiteId },
        select: {
          id: true,
          authorId: true,
          isDeleted: true,
          verificationStatus: true,
        },
      });

      if (!website || website.isDeleted) {
        throw new BadRequestException('Website not found');
      }

      if (website.authorId !== userId) {
        throw new BadRequestException('Unauthorized');
      }

      if (website.verificationStatus === 'VERIFIED') {
        throw new BadRequestException('Website already verified');
      }

      if (website.verificationStatus !== 'VERIFICATION_FAILED') {
        throw new BadRequestException(
          'Manual review can only be requested after failed verification',
        );
      }

      const existingPendingReview = await tx.websiteVerification.findFirst({
        where: {
          websiteId: website.id,
          status: 'REQUESTED_FOR_MANUAL_REVIEW',
          manuallyReviewedByAdminUserId: null,
        },
        select: {
          id: true,
        },
      });

      if (existingPendingReview) {
        throw new BadRequestException(
          'A manual review request is already pending',
        );
      }

      const failedVerification = await tx.websiteVerification.findFirst({
        where: {
          websiteId: website.id,
          status: 'VERIFICATION_FAILED',
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          type: true,
        },
      });

      if (!failedVerification) {
        throw new BadRequestException('Failed verification request not found');
      }

      const verification = await tx.websiteVerification.create({
        data: {
          websiteId: website.id,
          type: failedVerification.type,
          status: 'REQUESTED_FOR_MANUAL_REVIEW',
          requestedByUserId: userId,
        },
      });

      await tx.website.update({
        where: { id: website.id },
        data: {
          verificationStatus: 'PENDING',
          latestVerificationId: verification.id,
        },
      });

      return sendResponse('Manual review request submitted successfully', {
        websiteId: website.id,
        websiteVerificationId: verification.id,
      });
    });
  }
}

