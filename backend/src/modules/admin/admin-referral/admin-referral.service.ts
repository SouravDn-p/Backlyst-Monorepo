import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreditReason,
  Prisma,
  ReferralAttributionStatus,
  ReferralStage,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  AdminReferralActionDto,
  ApproveReferralCreditDto,
  DisableEntityReferralsDto,
  DisableReferralTarget,
} from './dto/admin-referral-action.dto';
import {
  AdminReferralConversionFilter,
  AdminReferralRegistryQueryDto,
} from './dto/admin-referral-query.dto';

const ADMIN_APPROVE_NOTE = '[ADMIN_REFERRAL_APPROVE]';
const ADMIN_REVOKE_NOTE = '[ADMIN_REFERRAL_REVOKE]';

type Tx = Prisma.TransactionClient;

const ADMIN_REFERRAL_INCLUDE = Prisma.validator<Prisma.UserReferralInclude>()({
  referrerUser: {
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      isReferralEnabled: true,
    },
  },
  referredUser: {
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      isReferralEnabled: true,
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
  subscription: {
    select: {
      id: true,
      status: true,
      startDate: true,
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
  rewards: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      stage: true,
      referrerTaskCredits: true,
      referrerVisibilityCredits: true,
      referredTaskCredits: true,
      referredVisibilityCredits: true,
      createdAt: true,
    },
  },
  creditLogs: {
    orderBy: { createdAt: 'desc' },
    take: 25,
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
      actorId: true,
    },
  },
  adminAuditLogs: {
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      action: true,
      reason: true,
      metadata: true,
      createdAt: true,
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
});

type AdminReferralRecord = Prisma.UserReferralGetPayload<{
  include: typeof ADMIN_REFERRAL_INCLUDE;
}>;

@Injectable()
export class AdminReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async getReferralRegistry(query: AdminReferralRegistryQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.UserReferralWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...this.buildConversionWhere(query.conversion),
      ...(search
        ? {
            OR: [
              { codeUsed: { contains: search, mode: 'insensitive' } },
              {
                referrerUser: {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { companyName: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
              {
                referredUser: {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { companyName: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
              {
                referredWebsite: {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { websiteUrl: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [totalItems, referrals, config] = await this.prisma.$transaction([
      this.prisma.userReferral.count({ where }),
      this.prisma.userReferral.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.getReferralInclude(),
      }),
      this.prisma.referralProgramConfig.upsert({
        where: { id: 'platform' },
        update: {},
        create: { id: 'platform' },
      }),
    ]);

    return sendResponse('Referral attribution registry fetched successfully', {
      policy: 'ONE_CREDIT_PER_USER_ENFORCED',
      emergencyFreeze: {
        frozen: config.referralsFrozen,
        reason: config.freezeReason,
        frozenAt: config.frozenAt,
      },
      items: referrals.map((referral) => this.toRegistryRow(referral)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasNextPage: page * limit < totalItems,
        hasPreviousPage: page > 1,
      },
    });
  }

  async getReferralDetails(referralId: string) {
    const referral = await this.findReferralOrThrow(referralId);

    return sendResponse(
      'Referral credit details fetched successfully',
      this.toReferralDetails(referral),
    );
  }

  async approveReferralCredit(
    referralId: string,
    adminId: string,
    payload: ApproveReferralCreditDto,
  ) {
    const existing = await this.findExistingAudit(payload.idempotencyKey);
    if (existing) {
      return sendResponse('Referral approval already processed', {
        alreadyProcessed: true,
        auditId: existing.id,
        referralId: existing.referralId,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const referral = await this.findReferralOrThrow(referralId, tx);

      if (referral.status === ReferralAttributionStatus.REVOKED) {
        throw new BadRequestException('Revoked referrals cannot be approved.');
      }

      const existingCredit = this.getReferralCreditAmount(referral);
      const issuedCredit =
        existingCredit === 0 && payload.creditAmount
          ? await this.issueReferralCredit(
              tx,
              referral,
              payload.creditAmount,
              adminId,
            )
          : 0;

      const updatedReferral = await tx.userReferral.update({
        where: { id: referralId },
        data: {
          status: ReferralAttributionStatus.VERIFIED,
          approvedAt: new Date(),
          approvedById: adminId,
          flaggedAt: null,
          flagReason: null,
          revokedAt: null,
          revokedById: null,
          revokeReason: null,
        },
        include: this.getReferralInclude(),
      });

      const audit = await this.createAudit(tx, {
        referralId,
        adminId,
        action: 'APPROVE_CREDIT',
        reason: payload.reason,
        idempotencyKey: payload.idempotencyKey,
        metadata: {
          existingCredit,
          issuedCredit,
          finalCreditAmount: existingCredit + issuedCredit,
        },
      });

      return {
        alreadyProcessed: false,
        auditId: audit.id,
        referral: this.toRegistryRow(updatedReferral),
        issuedCredit,
      };
    });

    return sendResponse('Referral credit approved successfully', result);
  }

  async revokeReferralCredit(
    referralId: string,
    adminId: string,
    payload: AdminReferralActionDto,
  ) {
    const existing = await this.findExistingAudit(payload.idempotencyKey);
    if (existing) {
      return sendResponse('Referral revocation already processed', {
        alreadyProcessed: true,
        auditId: existing.id,
        referralId: existing.referralId,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const referral = await this.findReferralOrThrow(referralId, tx);
      const creditAmount = this.getReferralCreditAmount(referral);

      if (creditAmount <= 0) {
        throw new BadRequestException(
          'Referral has no issued credit to revoke.',
        );
      }

      const reversal = await this.reverseReferralCredit(
        tx,
        referral,
        creditAmount,
        adminId,
        payload.reason,
      );

      const updatedReferral = await tx.userReferral.update({
        where: { id: referralId },
        data: {
          status: ReferralAttributionStatus.REVOKED,
          revokedAt: new Date(),
          revokedById: adminId,
          revokeReason: payload.reason,
        },
        include: this.getReferralInclude(),
      });

      const audit = await this.createAudit(tx, {
        referralId,
        adminId,
        action: 'REVOKE_CREDIT',
        reason: payload.reason,
        idempotencyKey: payload.idempotencyKey,
        metadata: reversal,
      });

      return {
        alreadyProcessed: false,
        auditId: audit.id,
        referral: this.toRegistryRow(updatedReferral),
        reversal,
      };
    });

    return sendResponse('Referral credit revoked successfully', result);
  }

  async disableEntityReferrals(
    referralId: string,
    adminId: string,
    payload: DisableEntityReferralsDto,
  ) {
    const referral = await this.findReferralOrThrow(referralId);
    const targetUserId =
      payload.target === DisableReferralTarget.REFERRER
        ? referral.referrerUserId
        : referral.referredUserId;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: targetUserId },
        data: { isReferralEnabled: false },
        select: {
          id: true,
          name: true,
          email: true,
          isReferralEnabled: true,
        },
      });

      const audit = await this.createAudit(tx, {
        referralId,
        adminId,
        action: `DISABLE_${payload.target}_REFERRALS`,
        reason: payload.reason,
        idempotencyKey: payload.idempotencyKey,
        metadata: { target: payload.target, targetUserId },
      });

      return {
        auditId: audit.id,
        target: payload.target,
        user,
      };
    });

    return sendResponse('Entity referrals disabled successfully', result);
  }

  async freezeReferralProgram(
    adminId: string,
    payload: AdminReferralActionDto,
  ) {
    const existing = await this.findExistingAudit(payload.idempotencyKey);
    if (existing) {
      return sendResponse('Referral freeze already processed', {
        alreadyProcessed: true,
        auditId: existing.id,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const config = await tx.referralProgramConfig.upsert({
        where: { id: 'platform' },
        update: {
          referralsFrozen: true,
          freezeReason: payload.reason,
          frozenById: adminId,
          frozenAt: new Date(),
        },
        create: {
          id: 'platform',
          referralsFrozen: true,
          freezeReason: payload.reason,
          frozenById: adminId,
          frozenAt: new Date(),
        },
      });

      const audit = await this.createAudit(tx, {
        referralId: null,
        adminId,
        action: 'FREEZE_REFERRALS',
        reason: payload.reason,
        idempotencyKey: payload.idempotencyKey,
        metadata: { referralsFrozen: true },
      });

      return {
        alreadyProcessed: false,
        auditId: audit.id,
        config,
      };
    });

    return sendResponse('Referral program frozen successfully', result);
  }

  private buildConversionWhere(
    conversion?: AdminReferralConversionFilter,
  ): Prisma.UserReferralWhereInput {
    if (!conversion) {
      return {};
    }

    if (conversion === AdminReferralConversionFilter.FREE_TO_PAID) {
      return {
        OR: [
          { currentStage: ReferralStage.PAID_SUBSCRIPTION },
          { paidSubscriptionAt: { not: null } },
          { subscriptionId: { not: null } },
        ],
      };
    }

    if (conversion === AdminReferralConversionFilter.PENDING) {
      return {
        status: ReferralAttributionStatus.PENDING,
      };
    }

    return {
      currentStage: { not: ReferralStage.PAID_SUBSCRIPTION },
      paidSubscriptionAt: null,
      subscriptionId: null,
      status: { not: ReferralAttributionStatus.PENDING },
    };
  }

  private getReferralInclude() {
    return ADMIN_REFERRAL_INCLUDE;
  }

  private async findReferralOrThrow(
    referralId: string,
    tx: Tx | PrismaService = this.prisma,
  ): Promise<AdminReferralRecord> {
    const referral = await tx.userReferral.findUnique({
      where: { id: referralId },
      include: this.getReferralInclude(),
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    return referral;
  }

  private async findExistingAudit(idempotencyKey?: string) {
    if (!idempotencyKey) {
      return null;
    }

    return this.prisma.adminReferralAuditLog.findUnique({
      where: { idempotencyKey },
      select: {
        id: true,
        referralId: true,
        action: true,
      },
    });
  }

  private async createAudit(
    tx: Tx,
    data: {
      referralId: string | null;
      adminId: string;
      action: string;
      reason: string;
      idempotencyKey?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    try {
      return await tx.adminReferralAuditLog.create({
        data: {
          referralId: data.referralId,
          adminId: data.adminId,
          action: data.action,
          reason: data.reason,
          idempotencyKey: data.idempotencyKey,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'idempotencyKey was already used for another referral action',
        );
      }

      throw error;
    }
  }

  private toRegistryRow(referral: AdminReferralRecord) {
    const creditAmount = this.getReferralCreditAmount(referral);

    return {
      referralId: this.formatReferralId(referral.id),
      userReferralId: referral.id,
      referrer: this.toEntity(referral.referrerUser),
      referred: this.toEntity(referral.referredUser),
      referredWebsite: referral.referredWebsite
        ? {
            id: referral.referredWebsite.id,
            name: referral.referredWebsite.name,
            url: referral.referredWebsite.websiteUrl,
            verificationStatus: referral.referredWebsite.verificationStatus,
          }
        : null,
      source: referral.source,
      sourceLabel: this.formatSource(referral.source),
      creditAmount,
      status: referral.status,
      conversion: this.resolveConversion(referral),
      currentStage: referral.currentStage,
      signedUpAt: referral.signedUpAt,
      createdAt: referral.createdAt,
      oversightEndpoint: `/admin/referrals/${referral.id}`,
    };
  }

  private toReferralDetails(referral: AdminReferralRecord) {
    const creditAmount = this.getReferralCreditAmount(referral);

    return {
      referral: {
        id: this.formatReferralId(referral.id),
        userReferralId: referral.id,
        status: referral.status,
        source: referral.source,
        sourceLabel: this.formatSource(referral.source),
        originalSource: 'Backlyst',
        codeUsed: referral.codeUsed,
        currentStage: referral.currentStage,
        conversion: this.resolveConversion(referral),
        approvedAt: referral.approvedAt,
        revokedAt: referral.revokedAt,
        revokeReason: referral.revokeReason,
        flaggedAt: referral.flaggedAt,
        flagReason: referral.flagReason,
      },
      chain: {
        referrer: this.toEntity(referral.referrerUser),
        referred: this.toEntity(referral.referredUser),
        referredWebsite: referral.referredWebsite
          ? {
              id: referral.referredWebsite.id,
              name: referral.referredWebsite.name,
              url: referral.referredWebsite.websiteUrl,
              verificationStatus: referral.referredWebsite.verificationStatus,
            }
          : null,
      },
      credit: {
        type: 'Referral reward',
        totalIssued: creditAmount,
        rewards: referral.rewards,
      },
      history: this.buildHistory(referral),
      auditTrail: referral.adminAuditLogs,
      actions: {
        canApprove: referral.status !== ReferralAttributionStatus.REVOKED,
        canRevoke:
          referral.status !== ReferralAttributionStatus.REVOKED &&
          creditAmount > 0,
        canDisableEntityReferrals:
          referral.referrerUser.isReferralEnabled ||
          referral.referredUser.isReferralEnabled,
      },
    };
  }

  private buildHistory(referral: AdminReferralRecord) {
    const rewardHistory = referral.rewards.map((reward) => ({
      label: 'CREDIT ISSUED',
      note: `${reward.stage.replace(/_/g, ' ')} REWARD`,
      amount: reward.referrerTaskCredits,
      date: reward.createdAt,
    }));

    const verificationHistory = [
      referral.websiteVerifiedAt
        ? {
            label: 'VERIFICATION',
            note: 'REFERRAL WEBSITE VERIFIED',
            amount: null,
            date: referral.websiteVerifiedAt,
          }
        : null,
      referral.firstBacklinkAt
        ? {
            label: 'BACKLINK ACCEPTED',
            note: 'FIRST BACKLINK ACCEPTED',
            amount: null,
            date: referral.firstBacklinkAt,
          }
        : null,
      referral.paidSubscriptionAt
        ? {
            label: 'CONVERSION',
            note: 'FREE TO PAID SUBSCRIPTION',
            amount: null,
            date: referral.paidSubscriptionAt,
          }
        : null,
    ].filter(Boolean);

    const creditLogHistory = referral.creditLogs.map((log) => ({
      label: `${log.action} ${log.creditType}`,
      note: log.note,
      amount: log.amount,
      date: log.createdAt,
    }));

    return [...rewardHistory, ...verificationHistory, ...creditLogHistory].sort(
      (a, b) => {
        const da = a?.date ? a.date.getTime() : 0;
        const db = b?.date ? b.date.getTime() : 0;
        return db - da;
      },
    );
  }

  private async issueReferralCredit(
    tx: Tx,
    referral: AdminReferralRecord,
    amount: number,
    adminId: string,
  ) {
    const wallet = await tx.userCreditWallet.upsert({
      where: { userId: referral.referrerUserId },
      update: {},
      create: { userId: referral.referrerUserId },
      select: {
        id: true,
        referralTaskCredits: true,
      },
    });

    const updatedWallet = await tx.userCreditWallet.update({
      where: { userId: referral.referrerUserId },
      data: { referralTaskCredits: { increment: amount } },
      select: {
        referralTaskCredits: true,
      },
    });

    await tx.referralReward.upsert({
      where: {
        referralId_stage: {
          referralId: referral.id,
          stage: referral.currentStage,
        },
      },
      update: {
        referrerTaskCredits: { increment: amount },
      },
      create: {
        referralId: referral.id,
        stage: referral.currentStage,
        referrerTaskCredits: amount,
      },
    });

    await tx.creditLog.create({
      data: {
        walletId: wallet.id,
        userId: referral.referrerUserId,
        actorId: adminId,
        creditType: 'EARNED_TASK',
        action: 'ADD',
        reason: this.stageToCreditReason(referral.currentStage),
        amount,
        balanceBefore: wallet.referralTaskCredits,
        balanceAfter: updatedWallet.referralTaskCredits,
        referralId: referral.id,
        note: `${ADMIN_APPROVE_NOTE} Referral credit approved by admin.`,
      },
    });

    return amount;
  }

  private async reverseReferralCredit(
    tx: Tx,
    referral: AdminReferralRecord,
    amount: number,
    adminId: string,
    reason: string,
  ) {
    const wallet = await tx.userCreditWallet.upsert({
      where: { userId: referral.referrerUserId },
      update: {},
      create: { userId: referral.referrerUserId },
      select: {
        id: true,
        referralTaskCredits: true,
      },
    });

    const websiteWallets = await tx.websiteCreditWallet.findMany({
      where: {
        website: {
          authorId: referral.referrerUserId,
          isDeleted: false,
        },
        allocatedReferralCredits: {
          gt: 0,
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        websiteId: true,
        allocatedReferralCredits: true,
      },
    });

    const available =
      wallet.referralTaskCredits +
      websiteWallets.reduce(
        (total, item) => total + item.allocatedReferralCredits,
        0,
      );

    if (available < amount) {
      throw new BadRequestException(
        'Not enough remaining referral credit to revoke safely.',
      );
    }

    let remaining = amount;
    const movements: Array<{
      scope: 'MASTER' | 'WEBSITE';
      websiteId?: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
    }> = [];

    const masterDeduction = Math.min(wallet.referralTaskCredits, remaining);
    if (masterDeduction > 0) {
      const updatedWallet = await tx.userCreditWallet.update({
        where: { userId: referral.referrerUserId },
        data: { referralTaskCredits: { decrement: masterDeduction } },
        select: { referralTaskCredits: true },
      });

      await tx.creditLog.create({
        data: {
          walletId: wallet.id,
          userId: referral.referrerUserId,
          actorId: adminId,
          creditType: 'EARNED_TASK',
          action: 'SPEND',
          reason: 'MANUAL',
          amount: masterDeduction,
          balanceBefore: wallet.referralTaskCredits,
          balanceAfter: updatedWallet.referralTaskCredits,
          referralId: referral.id,
          note: `${ADMIN_REVOKE_NOTE} ${reason}`,
        },
      });

      movements.push({
        scope: 'MASTER',
        amount: masterDeduction,
        balanceBefore: wallet.referralTaskCredits,
        balanceAfter: updatedWallet.referralTaskCredits,
      });
      remaining -= masterDeduction;
    }

    for (const websiteWallet of websiteWallets) {
      if (remaining <= 0) {
        break;
      }

      const deduction = Math.min(
        websiteWallet.allocatedReferralCredits,
        remaining,
      );
      const updatedWebsiteWallet = await tx.websiteCreditWallet.update({
        where: { websiteId: websiteWallet.websiteId },
        data: { allocatedReferralCredits: { decrement: deduction } },
        select: { allocatedReferralCredits: true },
      });

      await tx.creditLog.create({
        data: {
          walletId: wallet.id,
          userId: referral.referrerUserId,
          actorId: adminId,
          websiteId: websiteWallet.websiteId,
          creditType: 'EARNED_TASK',
          action: 'SPEND',
          reason: 'MANUAL',
          amount: deduction,
          balanceBefore: websiteWallet.allocatedReferralCredits,
          balanceAfter: updatedWebsiteWallet.allocatedReferralCredits,
          referralId: referral.id,
          note: `${ADMIN_REVOKE_NOTE} ${reason}`,
        },
      });

      movements.push({
        scope: 'WEBSITE',
        websiteId: websiteWallet.websiteId,
        amount: deduction,
        balanceBefore: websiteWallet.allocatedReferralCredits,
        balanceAfter: updatedWebsiteWallet.allocatedReferralCredits,
      });
      remaining -= deduction;
    }

    return {
      totalReversed: amount,
      movements,
    };
  }

  private getReferralCreditAmount(referral: AdminReferralRecord) {
    return referral.rewards.reduce(
      (total, reward) => total + reward.referrerTaskCredits,
      0,
    );
  }

  private resolveConversion(referral: AdminReferralRecord) {
    if (
      referral.currentStage === ReferralStage.PAID_SUBSCRIPTION ||
      referral.paidSubscriptionAt ||
      referral.subscriptionId
    ) {
      return 'FREE_TO_PAID';
    }

    if (referral.status === ReferralAttributionStatus.PENDING) {
      return 'PENDING';
    }

    return 'NO_CONVERSION';
  }

  private stageToCreditReason(stage: ReferralStage): CreditReason {
    if (stage === ReferralStage.WEBSITE_VERIFIED) {
      return CreditReason.REFERRAL_WEBSITE_VERIFIED;
    }

    if (stage === ReferralStage.FIRST_BACKLINK_ACCEPTED) {
      return CreditReason.REFERRAL_FIRST_BACKLINK;
    }

    if (stage === ReferralStage.PAID_SUBSCRIPTION) {
      return CreditReason.REFERRAL_PAID_SUBSCRIPTION;
    }

    return CreditReason.MANUAL;
  }

  private toEntity(entity: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
    isReferralEnabled: boolean;
  }) {
    return {
      id: entity.id,
      name: entity.companyName ?? entity.name,
      contactName: entity.name,
      email: entity.email,
      isReferralEnabled: entity.isReferralEnabled,
    };
  }

  private formatReferralId(id: string) {
    return `REF-${id.slice(-6).toUpperCase()}`;
  }

  private formatSource(source: string) {
    return source.replace(/_/g, ' ');
  }
}
