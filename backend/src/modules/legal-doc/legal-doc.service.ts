import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LegalDocumentType, Prisma } from '@prisma/client';
import { CreateLegalDocVersionDto } from './dto/create-legal-doc.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

/*
  These documents are supposed to be immutable in-place.
  Each change must create a new version instead of modifying the existing one.

  Only one version can be active at a time per document type.
*/

@Injectable()
export class LegalDocService {
  constructor(private readonly prisma: PrismaService) {}

  async createLegalDoc(payload: CreateLegalDocVersionDto, userId: string) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const document = await tx.legalDocument.upsert({
          where: { type: payload.type },
          create: {
            type: payload.type,
            title: payload.type.replaceAll('_', ' '),
          },
          update: {},
        });

        const version = await tx.legalDocumentVersion.create({
          data: {
            documentId: document.id,
            content: payload.content,
            version: payload.version,
            createdByUserId: userId,
            isActive: false,
          },
        });

        return version;
      });

      return sendResponse('created', result);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Version already exists for this document type',
        );
      }

      throw error;
    }
  }

  // async getAllLegalDocs(
  //   search?: string,
  //   page = 1,
  //   limit = 10,
  //   filter?: {
  //     type?: LegalDocumentType;
  //     isActive?: boolean;
  //   },
  // ) {
  //   const where: Prisma.LegalDocumentWhereInput = {};

  //   // Filter by type
  //   if (filter?.type) {
  //     where.type = filter.type;
  //   }

  //   // Filter by active version
  //   if (typeof filter?.isActive === 'boolean') {
  //     where.versions = {
  //       some: {
  //         isActive: filter.isActive,
  //       },
  //     };
  //   }

  //   // Search
  //   if (search) {
  //     const orConditions: Prisma.LegalDocumentWhereInput[] = [
  //       {
  //         title: {
  //           contains: search,
  //           mode: 'insensitive',
  //         },
  //       },
  //     ];

  //     // Only search enum if valid
  //     const isValidType = Object.values(LegalDocumentType).includes(
  //       search as LegalDocumentType,
  //     );

  //     if (isValidType) {
  //       orConditions.push({
  //         type: search as LegalDocumentType,
  //       });
  //     }

  //     where.OR = orConditions;
  //   }

  //   const skip = (page - 1) * limit;

  //   const [data, total] = await this.prisma.$transaction([
  //     this.prisma.legalDocument.findMany({
  //       where,
  //       skip,
  //       take: limit,
  //       orderBy: {
  //         createdAt: 'desc',
  //       },
  //       include: {
  //         versions: {
  //           where:
  //             typeof filter?.isActive === 'boolean'
  //               ? {
  //                   isActive: filter.isActive,
  //                 }
  //               : undefined,
  //           orderBy: {
  //             createdAt: 'desc',
  //           },
  //         },
  //       },
  //     }),

  //     this.prisma.legalDocument.count({
  //       where,
  //     }),
  //   ]);

  //   return sendResponse('success', {
  //     meta: {
  //       page,
  //       limit,
  //       total,
  //       totalPage: Math.ceil(total / limit),
  //     },
  //     data,
  //   });
  // }

  async getAllLegalDocs(
    search?: string,
    page = 1,
    limit = 10,
    filter?: {
      type?: LegalDocumentType;
      isActive?: boolean;
    },
  ) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.LegalDocumentWhereInput = {};

    if (filter?.type) {
      where.type = filter.type;
    }

    if (typeof filter?.isActive === 'boolean') {
      where.versions = {
        some: {
          isActive: filter.isActive,
        },
      };
    }

    const normalizedSearch = search?.trim();

    if (normalizedSearch) {
      const orConditions: Prisma.LegalDocumentWhereInput[] = [
        {
          title: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
      ];

      const isValidType = Object.values(LegalDocumentType).includes(
        normalizedSearch as LegalDocumentType,
      );

      if (isValidType) {
        orConditions.push({
          type: normalizedSearch as LegalDocumentType,
        });
      }

      where.OR = orConditions;
    }

    const [documents, total] = await this.prisma.$transaction([
      this.prisma.legalDocument.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          type: true,
          title: true,
          activeVersionId: true,
          createdAt: true,
          updatedAt: true,
          versions: {
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              version: true,
              isActive: true,
              publishedAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          _count: {
            select: {
              versions: true,
            },
          },
        },
      }),

      this.prisma.legalDocument.count({
        where,
      }),
    ]);

    const data = documents.map((document) => {
      const latestVersion = document.versions[0] ?? null;
      const activeVersion =
        document.versions.find((version) => version.isActive) ?? null;

      return {
        id: document.id,
        type: document.type,
        title: document.title,
        activeVersionId: document.activeVersionId,
        activeVersion,
        latestVersion,
        totalVersions: document._count.versions,
        isActive: Boolean(activeVersion),
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      };
    });

    return sendResponse('Legal documents fetched successfully', {
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        hasNextPage: safePage * safeLimit < total,
        hasPreviousPage: safePage > 1,
      },
      data,
    });
  }

  async getLegalDocById(id: string) {
    const result = await this.prisma.legalDocument.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Legal document not found');
    }

    return sendResponse('success', result);
  }

  async activateVersion(id: string) {
    return this.prisma.$transaction(async (tx) => {
      let version = await tx.legalDocumentVersion.findUnique({
        where: { id },
        select: {
          id: true,
          documentId: true,
        },
      });

      if (!version) {
        version = await tx.legalDocumentVersion.findFirst({
          where: {
            documentId: id,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            documentId: true,
          },
        });
      }

      if (!version) {
        throw new NotFoundException('Legal document version not found');
      }

      await tx.legalDocumentVersion.updateMany({
        where: {
          documentId: version.documentId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      const updated = await tx.legalDocumentVersion.update({
        where: { id: version.id },
        data: {
          isActive: true,
          publishedAt: new Date(),
        },
      });

      await tx.legalDocument.update({
        where: { id: version.documentId },
        data: {
          activeVersionId: updated.id,
        },
      });

      return sendResponse('success', updated);
    });
  }

  async getVersionById(versionId: string) {
    const version = await this.prisma.legalDocumentVersion.findUnique({
      where: { id: versionId },
      include: {
        document: true,
      },
    });

    if (!version) {
      throw new NotFoundException('Legal document version not found');
    }

    return sendResponse('success', version);
  }

  async deleteVersionById(versionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.legalDocumentVersion.findUnique({
        where: { id: versionId },
      });

      if (!version) {
        throw new NotFoundException('Legal document version not found');
      }

      if (version.isActive) {
        throw new BadRequestException('Cannot delete an active version');
      }

      const deleted = await tx.legalDocumentVersion.delete({
        where: { id: versionId },
      });

      return sendResponse('success', {
        message: 'Version deleted successfully',
        id: deleted.id,
      });
    });
  }

  async acceptActiveDocument(userId: string, type: LegalDocumentType) {
    return this.prisma.$transaction(async (tx) => {
      const activeVersion = await tx.legalDocumentVersion.findFirst({
        where: {
          isActive: true,
          document: {
            type,
          },
        },
        select: {
          id: true,
        },
      });

      if (!activeVersion) {
        throw new NotFoundException('Active legal document not found');
      }

      const existingAcceptance = await tx.userLegalAcceptance.findUnique({
        where: {
          userId_versionId: {
            userId,
            versionId: activeVersion.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingAcceptance) {
        throw new BadRequestException('Legal document already accepted');
      }

      const acceptance = await tx.userLegalAcceptance.create({
        data: {
          userId,
          versionId: activeVersion.id,
        },
      });

      return sendResponse('success', {
        message: 'Legal document accepted successfully',
        acceptance,
      });
    });
  }

  async getMyAcceptedLegalDocuments(userId: string) {
    const acceptances = await this.prisma.userLegalAcceptance.findMany({
      where: { userId },
      select: {
        versionId: true,
        version: {
          select: {
            documentId: true,
          },
        },
      },
    });

    const acceptedMap = new Map<string, string>();

    for (const acc of acceptances) {
      if (acc.version?.documentId) {
        acceptedMap.set(acc.version.documentId, acc.versionId);
      }
    }

    const documents = await this.prisma.legalDocument.findMany({
      where: {
        versions: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        title: true,
        versions: {
          where: {
            isActive: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            version: true,
            createdAt: true,
          },
        },
      },
    });

    const result = documents.map((doc) => {
      const latest = doc.versions[0];

      const acceptedVersionId = acceptedMap.get(doc.id);

      return {
        document: {
          id: doc.id,
          title: doc.title,
        },
        latestVersion: latest,
        isLatest: true,
        isAccepted: acceptedVersionId === latest?.id,
        hasAcceptedAnyVersion: !!acceptedVersionId,
      };
    });

    return sendResponse('success', result);
  }
}
