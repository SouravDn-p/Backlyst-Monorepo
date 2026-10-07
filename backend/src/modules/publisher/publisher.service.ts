import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePublisherProfile } from './dto/create-publisher.dto';
import { sendResponse } from 'src/utils/sendResponse';
import { Prisma } from '@prisma/client';
import { UpdatePublisherProfile } from './dto/update-publisher.dto';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';

@Injectable()
export class PublisherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: AwsS3Service,
  ) {}

  async createPublisherProfile(
    userId: string,
    payload: CreatePublisherProfile,
  ) {
    // 1. Check user existence (optional optimization below)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Check existing publisher profile
    const existingPublisher = await this.prisma.publisher.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (existingPublisher) {
      throw new BadRequestException('Publisher profile already exists');
    }

    // 3. Create publisher profile
    const publisher = await this.prisma.publisher.create({
      data: {
        userId,
        nicheSpecialization: payload.nicheSpecialization,
        bio: payload.bio,
        tags: payload.tags, // already normalized in DTO
      },
    });

    return sendResponse('Publisher profile created successfully', publisher);
  }

  async getPublisherProfile(userId: string) {
    const publisher = await this.prisma.publisher.findUnique({
      where: { userId },
      select: {
        id: true,
        nicheSpecialization: true,
        bio: true,
        tags: true,
        isVerified: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageKey: true,
            role: true,
            isVerified: true,
          },
        },
      },
    });

    if (!publisher) {
      throw new NotFoundException('Publisher profile not found');
    }

    const verifiedDomainsPromise = this.prisma.website.count({
      where: {
        authorId: userId,
        verificationStatus: 'VERIFIED',
      },
    });

    const averageDomainRating = 65;
    // TODO: Replace hardcoded value by calculating the average domain rating
    // from all verified publisher websites using Moz Domain Authority API.

    const averageResponseTime = 80;
    // TODO: Replace hardcoded value by calculating the publisher's average
    // chat response time (in minutes) from the messaging/chat module.

    const platformSuccessRate = 95;
    // TODO: Replace hardcoded value by calculating the publisher's
    // task/order completion success rate percentage from platform activity data.

    let avatarUrl: string | null = null;

    if (publisher.user.imageKey) {
      const signedUrl = await this.s3.getDownloadUrl(publisher.user.imageKey);

      avatarUrl = signedUrl.downloadUrl;
    }

    const verifiedDomains = await verifiedDomainsPromise;

    const result = {
      ...publisher,

      user: {
        ...publisher.user,
        avatarUrl,
      },

      stats: {
        averageDomainRating,
        averageResponseTime,
        platformSuccessRate,
        verifiedDomains,
      },
    };

    return sendResponse('success', result);
  }

  async getAllPublishers(search?: string, page = 1, limit = 10) {
    const where: Prisma.PublisherWhereInput = {};

    if (search?.trim()) {
      const normalizedSearch = search.trim();

      where.OR = [
        {
          nicheSpecialization: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          bio: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          tags: {
            has: normalizedSearch.toLowerCase(),
          },
        },
        {
          user: {
            name: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            email: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const totalPublishers = await this.prisma.publisher.count({});

    const [publishers, total] = await Promise.all([
      this.prisma.publisher.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),

      this.prisma.publisher.count({
        where,
      }),
    ]);

    return sendResponse('success', {
      data: publishers,
      totalPublishers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async updatePublisherProfile(
    userId: string,
    payload: UpdatePublisherProfile,
  ) {
    const publisher = await this.prisma.publisher.findUnique({
      where: { userId },
      select: {
        id: true,
        tags: true,
      },
    });

    if (!publisher) {
      throw new NotFoundException('Publisher profile not found');
    }

    let mergedTags: string[] | undefined;

    if (payload.tags) {
      mergedTags = [
        ...new Set([
          ...publisher.tags,
          ...payload.tags.map((tag) => tag.toLowerCase()),
        ]),
      ].filter(Boolean);
    }

    const updatedPublisher = await this.prisma.publisher.update({
      where: { userId },
      data: {
        ...(payload.nicheSpecialization && {
          nicheSpecialization: payload.nicheSpecialization,
        }),

        ...(payload.bio && {
          bio: payload.bio,
        }),

        ...(mergedTags && {
          tags: mergedTags,
        }),
      },
    });

    return sendResponse(
      'Publisher profile updated successfully',
      updatedPublisher,
    );
  }
}
