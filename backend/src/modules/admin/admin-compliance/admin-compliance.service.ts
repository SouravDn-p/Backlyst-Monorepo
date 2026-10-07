import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { AdminComplianceQueryDto } from './dto/admin-compliance-query.dto';

const LEGAL_DOCUMENT_TYPES = [
  'TERMS_AND_CONDITIONS',
  'PRIVACY_POLICY',
] as const;

const TASK_GOVERNANCE_EVENTS = [
  'TASK_DISPUTED',
  'TASK_FROZEN',
  'ADMIN_ABUSE_PATTERN_FLAGGED',
] as const;

const PURCHASED_CREDIT_NOTE_PREFIX = '[MASTER_PURCHASED_CHECKOUT]';
const VISIBILITY_CREDIT_NOTE_PREFIX = '[WEBSITE_VISIBILITY_CHECKOUT]';

@Injectable()
export class AdminComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async getConsentRecords(query: AdminComplianceQueryDto) {
    const { page, limit, skip, search } = this.getPagination(query);
    const userWhere: Prisma.UserWhereInput = {
      role: 'USER' as const,
      isDeleted: false,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              {
                companyName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [documents, users, total] = await Promise.all([
      this.prisma.legalDocument.findMany({
        where: {
          type: { in: [...LEGAL_DOCUMENT_TYPES] },
        },
        select: {
          type: true,
          versions: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              version: true,
              publishedAt: true,
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: userWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          userLegalAcceptances: {
            where: {
              version: {
                document: {
                  type: { in: [...LEGAL_DOCUMENT_TYPES] },
                },
              },
            },
            orderBy: { acceptedAt: 'desc' },
            select: {
              acceptedAt: true,
              version: {
                select: {
                  id: true,
                  version: true,
                  document: {
                    select: { type: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where: userWhere }),
    ]);

    const activeTerms = documents.find(
      (document) => document.type === 'TERMS_AND_CONDITIONS',
    )?.versions[0];
    const activePrivacy = documents.find(
      (document) => document.type === 'PRIVACY_POLICY',
    )?.versions[0];

    const items = users.map((user) => {
      const termsAcceptance = user.userLegalAcceptances.find(
        (acceptance) =>
          acceptance.version.document.type === 'TERMS_AND_CONDITIONS',
      );
      const privacyAcceptance = user.userLegalAcceptances.find(
        (acceptance) => acceptance.version.document.type === 'PRIVACY_POLICY',
      );

      const legalDocumentsConfigured = Boolean(activeTerms && activePrivacy);
      const isCurrent = Boolean(
        legalDocumentsConfigured &&
        termsAcceptance?.version.id === activeTerms?.id &&
        privacyAcceptance?.version.id === activePrivacy?.id,
      );

      const latestAcceptedAt = this.latestDate([
        termsAcceptance?.acceptedAt,
        privacyAcceptance?.acceptedAt,
      ]);

      return {
        userId: user.id,
        entityIdentity: user.companyName ?? user.name,
        userName: user.name,
        email: user.email,
        termsAcceptance: termsAcceptance
          ? `ACCEPTED V${termsAcceptance.version.version}`
          : 'NOT ACCEPTED',
        privacyAcceptance: privacyAcceptance
          ? `ACCEPTED V${privacyAcceptance.version.version}`
          : 'NOT ACCEPTED',
        versionTrackingDate: latestAcceptedAt,
        status: !legalDocumentsConfigured
          ? 'LEGAL_DOCUMENT_NOT_CONFIGURED'
          : isCurrent
            ? 'CURRENT'
            : 'RE_ACCEPTANCE_PENDING',
      };
    });

    return sendResponse('User consent records fetched successfully', {
      activeVersions: {
        terms: activeTerms
          ? {
              version: activeTerms.version,
              publishedAt: activeTerms.publishedAt,
            }
          : null,
        privacy: activePrivacy
          ? {
              version: activePrivacy.version,
              publishedAt: activePrivacy.publishedAt,
            }
          : null,
      },
      items,
      meta: this.paginationMeta(page, limit, total),
    });
  }

  async getGovernanceRecords(query: AdminComplianceQueryDto) {
    const { page, limit, skip, search } = this.getPagination(query);
    const where: Prisma.AdminUserGovernanceNoteWhereInput = search
      ? {
          OR: [
            { note: { contains: search, mode: 'insensitive' as const } },
            {
              subjectUser: {
                is: {
                  OR: [
                    {
                      name: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                    {
                      email: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                    {
                      companyName: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.adminUserGovernanceNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          note: true,
          createdAt: true,
          subjectUser: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
              status: true,
              suspendStart: true,
              suspendEnd: true,
              punishmentReason: true,
            },
          },
          adminUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.adminUserGovernanceNote.count({ where }),
    ]);

    return sendResponse('Account governance records fetched successfully', {
      items: rows.map((row) => ({
        referenceId: this.reference('GOV', row.id),
        userId: row.subjectUser.id,
        entityIdentity: row.subjectUser.companyName ?? row.subjectUser.name,
        email: row.subjectUser.email,
        accountStatus: row.subjectUser.status,
        governanceNote: row.note,
        punishmentReason: row.subjectUser.punishmentReason,
        suspension: {
          startsAt: row.subjectUser.suspendStart,
          endsAt: row.subjectUser.suspendEnd,
        },
        admin: {
          id: row.adminUser.id,
          name: row.adminUser.name,
          email: row.adminUser.email,
        },
        createdAt: row.createdAt,
      })),
      meta: this.paginationMeta(page, limit, total),
    });
  }

  async getAbuseReports(query: AdminComplianceQueryDto) {
    const { page, limit, skip, search } = this.getPagination(query);
    const where: Prisma.MessageReportWhereInput = search
      ? {
          OR: [
            { note: { contains: search, mode: 'insensitive' as const } },
            {
              reviewNote: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              reporter: {
                is: {
                  OR: [
                    {
                      name: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                    {
                      email: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.messageReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reason: true,
          note: true,
          status: true,
          reviewNote: true,
          reviewedAt: true,
          createdAt: true,
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          message: {
            select: {
              id: true,
              taskId: true,
              contextType: true,
              recordType: true,
              registryStatus: true,
              registryReason: true,
              createdAt: true,
              Sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              Receiver: {
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
      this.prisma.messageReport.count({ where }),
    ]);

    return sendResponse('Abuse reports fetched successfully', {
      items: rows.map((row) => ({
        referenceId: this.reference('ABU', row.id),
        type: row.reason,
        status: row.status,
        note: row.note,
        reviewAction: row.reviewNote,
        createdAt: row.createdAt,
        reviewedAt: row.reviewedAt,
        reporter: row.reporter,
        reviewedBy: row.reviewedBy,
        source: {
          messageId: row.message.id,
          taskId: row.message.taskId,
          contextType: row.message.contextType,
          recordType: row.message.recordType,
          registryStatus: row.message.registryStatus,
          registryReason: row.message.registryReason,
          sender: row.message.Sender,
          receiver: row.message.Receiver,
        },
      })),
      meta: this.paginationMeta(page, limit, total),
    });
  }

  async getTaskDisputes(query: AdminComplianceQueryDto) {
    const { page, limit, skip, search } = this.getPagination(query);
    const where: Prisma.TaskFlowWhereInput = {
      eventType: { in: [...TASK_GOVERNANCE_EVENTS] },
      ...(search
        ? {
            OR: [
              {
                actionTaken: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                note: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                placementTask: {
                  is: {
                    projectTitle: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.taskFlow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          placementTaskId: true,
          eventType: true,
          actorRole: true,
          fromStatus: true,
          toStatus: true,
          actionTaken: true,
          note: true,
          metadata: true,
          createdAt: true,
          placementTask: {
            select: {
              projectTitle: true,
              lifecycleStatus: true,
              requesterWebsiteId: true,
              assignedProviderWebsiteId: true,
            },
          },
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
            },
          },
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.taskFlow.count({ where }),
    ]);

    return sendResponse('Task dispute records fetched successfully', {
      items: rows.map((row) => ({
        referenceId: this.reference('DSP', row.id),
        taskId: row.placementTaskId,
        projectTitle: row.placementTask.projectTitle,
        type: row.eventType,
        currentTaskStatus: row.placementTask.lifecycleStatus,
        transition: {
          from: row.fromStatus,
          to: row.toStatus,
        },
        actionTaken: row.actionTaken,
        note: row.note,
        metadata: row.metadata,
        requester: row.requester,
        provider: row.provider,
        actor: row.actor,
        actorRole: row.actorRole,
        createdAt: row.createdAt,
      })),
      meta: this.paginationMeta(page, limit, total),
    });
  }

  async getFinancialRecords(query: AdminComplianceQueryDto) {
    const { page, limit, skip, search } = this.getPagination(query);
    const financialWhere = this.getFinancialRecordWhere();
    const where: Prisma.CreditLogWhereInput = search
      ? {
          AND: [
            financialWhere,
            {
              OR: [
                {
                  note: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  user: {
                    is: {
                      OR: [
                        {
                          name: {
                            contains: search,
                            mode: 'insensitive' as const,
                          },
                        },
                        {
                          email: {
                            contains: search,
                            mode: 'insensitive' as const,
                          },
                        },
                        {
                          companyName: {
                            contains: search,
                            mode: 'insensitive' as const,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        }
      : financialWhere;

    const [rows, total] = await Promise.all([
      this.prisma.creditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          creditType: true,
          action: true,
          reason: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          note: true,
          createdAt: true,
          subscriptionId: true,
          websiteId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
            },
          },
          website: {
            select: {
              id: true,
              name: true,
              websiteUrl: true,
            },
          },
          subscription: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  tier: true,
                  billingInterval: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.creditLog.count({ where }),
    ]);

    return sendResponse(
      'Subscription and paid-credit records fetched successfully',
      {
        items: rows.map((row) => ({
          referenceId: this.reference('FIN', row.id),
          internalRecordId: row.id,
          externalReference: this.extractStripeSessionId(row.note),
          recordType: this.resolveFinancialRecordType(row),
          recordStatus: 'RECORDED',
          creditType: row.creditType,
          action: row.action,
          reason: row.reason,
          creditAmount: row.amount,
          balanceBefore: row.balanceBefore,
          balanceAfter: row.balanceAfter,
          createdAt: row.createdAt,
          user: {
            id: row.user.id,
            entityIdentity: row.user.companyName ?? row.user.name,
            name: row.user.name,
            email: row.user.email,
          },
          website: row.website,
          subscription: row.subscription,
        })),
        meta: this.paginationMeta(page, limit, total),
        disclosure:
          'These are internal subscription and credit-ledger records. A Stripe transaction reference is returned only when it is present in the existing CreditLog note.',
      },
    );
  }

  private getFinancialRecordWhere(): Prisma.CreditLogWhereInput {
    return {
      OR: [
        {
          reason: 'SUBSCRIPTION_PURCHASE',
          action: { in: ['ADD', 'REWARD'] },
        },
        {
          action: 'ADD',
          reason: 'MANUAL',
          note: { startsWith: PURCHASED_CREDIT_NOTE_PREFIX },
        },
        {
          action: 'ADD',
          reason: 'MANUAL',
          creditType: 'VISIBILITY',
          note: { startsWith: VISIBILITY_CREDIT_NOTE_PREFIX },
        },
      ],
    };
  }

  private resolveFinancialRecordType(row: {
    reason: string;
    creditType: string;
    note: string | null;
    subscription: {
      plan: {
        name: string;
        tier: string;
      };
    } | null;
  }) {
    if (row.reason === 'SUBSCRIPTION_PURCHASE') {
      return row.subscription
        ? `${row.subscription.plan.tier}_SUBSCRIPTION`
        : 'SUBSCRIPTION_CREDIT';
    }

    if (row.note?.startsWith(PURCHASED_CREDIT_NOTE_PREFIX)) {
      return 'PURCHASED_TASK_CREDIT';
    }

    if (
      row.creditType === 'VISIBILITY' ||
      row.note?.startsWith(VISIBILITY_CREDIT_NOTE_PREFIX)
    ) {
      return 'VISIBILITY_CREDIT';
    }

    return 'CREDIT_RECORD';
  }

  private extractStripeSessionId(note: string | null) {
    if (!note) {
      return null;
    }

    const match = note.match(/\[(cs_[^\]]+)\]/);
    return match?.[1] ?? null;
  }

  private getPagination(query: AdminComplianceQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim() || undefined;

    return {
      page,
      limit,
      skip: (page - 1) * limit,
      search,
    };
  }

  private paginationMeta(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private reference(prefix: string, id: string) {
    return `${prefix}-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  private latestDate(values: Array<Date | undefined>) {
    const dates = values.filter((value): value is Date => Boolean(value));

    if (!dates.length) {
      return null;
    }

    return new Date(Math.max(...dates.map((date) => date.getTime())));
  }
}
