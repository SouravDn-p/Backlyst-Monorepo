import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreditAction,
  Prisma,
  ReferralStage,
  SubscriptionStatus,
  UserRole,
  UserStatus,
  WebsiteVerificationStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { BanUserDto } from './dto/ban-user.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { MailService } from 'src/common/utils/mail/mail.service';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { GetUserRegistryQueryDto } from './dto/get-user-registry-query.dto';
import { MessagingGateway } from 'src/modules/messaging/messaging.gateway';
import { AppendGovernanceNoteDto } from './dto/append-governance-note.dto';
import { AdminRegistryActionDto } from './dto/admin-registry-action.dto';
import { AdminUserRegistryQueryDto } from './dto/admin-user-registry-query.dto';
import { AdminUserGovernanceNoteDto } from './dto/admin-user-governance-note.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AdminUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly s3: AwsS3Service,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  private async getActiveUserOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        isDeleted: true,
        status: true,
        name: true,
        email: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private formatRegistryUserNumber(position: number) {
    return `USER ${String(position).padStart(3, '0')}`;
  }

  private formatOversightUserCode(userId: string) {
    return `USR-${userId.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
  }

  private formatCreditDisplay(value: number) {
    return `${new Intl.NumberFormat('en-US').format(value)} CR`;
  }

  private async appendInternalGovernanceNote(
    subjectUserId: string,
    adminUserId: string,
    note: string,
  ) {
    const trimmedNote = note.trim();

    if (!trimmedNote) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        note: string;
        createdAt: Date;
        adminUserId: string;
        adminEmail: string;
        adminName: string;
      }>
    >(Prisma.sql`
      INSERT INTO "AdminUserGovernanceNote" (
        "id",
        "subjectUserId",
        "adminUserId",
        "note",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${subjectUserId},
        ${adminUserId},
        ${trimmedNote},
        NOW()
      )
      RETURNING
        "id",
        "note",
        "createdAt",
        "adminUserId",
        (SELECT "email" FROM "User" WHERE "id" = ${adminUserId}) AS "adminEmail",
        (SELECT "name" FROM "User" WHERE "id" = ${adminUserId}) AS "adminName"
    `);

    const noteRow = rows[0];

    return {
      id: noteRow.id,
      note: noteRow.note,
      createdAt: noteRow.createdAt,
      adminUser: {
        id: noteRow.adminUserId,
        email: noteRow.adminEmail,
        name: noteRow.adminName,
      },
    };
  }

  private async getInternalGovernanceNotes(subjectUserId: string) {
    const tableRows = await this.prisma.$queryRaw<Array<{ exists: boolean }>>(
      Prisma.sql`
        SELECT to_regclass('"AdminUserGovernanceNote"') IS NOT NULL AS "exists"
      `,
    );

    if (!tableRows[0]?.exists) {
      return [];
    }

    const governanceNotes = await this.prisma.$queryRaw<
      Array<{
        id: string;
        note: string;
        createdAt: Date;
        adminUserId: string;
        adminName: string;
        adminEmail: string;
      }>
    >(Prisma.sql`
      SELECT
        note."id",
        note."note",
        note."createdAt",
        note."adminUserId",
        admin."name" AS "adminName",
        admin."email" AS "adminEmail"
      FROM "AdminUserGovernanceNote" note
      INNER JOIN "User" admin ON admin."id" = note."adminUserId"
      WHERE note."subjectUserId" = ${subjectUserId}
      ORDER BY note."createdAt" DESC
      LIMIT 20
    `);

    return governanceNotes.map((note) => ({
      id: note.id,
      note: note.note,
      createdAt: note.createdAt,
      adminUser: {
        id: note.adminUserId,
        name: note.adminName,
        email: note.adminEmail,
      },
    }));
  }

  private generateOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    return { otp, otpExpiry };
  }

  async banUser(id: string, payload: BanUserDto) {
    const user = await this.getActiveUserOrThrow(id);

    if (user.status === UserStatus.BANNED) {
      throw new BadRequestException('User is already banned');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.BANNED,
        punishmentReason: payload.reason,
        suspendStart: null,
        suspendEnd: null,
      },
    });

    this.mail.sendBannedUserEmail(user.email, {
      name: user.name,
      reason: payload.reason,
    });

    return sendResponse('User banned successfully');
  }

  async suspendUser(userId: string, payload: SuspendUserDto) {
    const user = await this.getActiveUserOrThrow(userId);

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('User is already suspended');
    }

    const now = new Date();

    const suspendUntil = new Date(
      now.getTime() + payload.durationInDays * 86400000,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED,
        punishmentReason: payload.reason,
        suspendStart: now,
        suspendEnd: suspendUntil,
      },
    });

    this.mail.sendSuspendedUserEmail(user.email, {
      name: user.name,
      reason: payload.reason,
      suspendStart: now.toISOString(),
      suspendEnd: suspendUntil.toISOString(),
      durationInDays: payload.durationInDays,
    });

    return sendResponse(`User suspended until ${suspendUntil.toISOString()}`);
  }

  async reactivateUser(id: string) {
    const user = await this.getActiveUserOrThrow(id);

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already active');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
        punishmentReason: null,
        suspendStart: null,
        suspendEnd: null,
      },
    });

    return sendResponse('User reactivated successfully');
  }

  async deleteUserByAdmin(id: string) {
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

    return sendResponse('User Deleted Successfully');
  }

  async changeRoleByAdmin(id: string, role: UserRole) {
    const isUserExist = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!isUserExist || isUserExist.isDeleted) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        role,
      },
    });

    return sendResponse('Role Changed Successfully');
  }

  async getUserRegistry(query: GetUserRegistryQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;
    const normalizedSearch = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      isDeleted: false,
      role: UserRole.USER,
      ...(query.status ? { status: query.status } : {}),
      ...(normalizedSearch
        ? {
            email: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.subscriptionTier
        ? {
            subscriptions: {
              some: {
                status: 'ACTIVE',
                plan: {
                  tier: query.subscriptionTier,
                },
              },
            },
          }
        : {}),
      ...(query.referralStatus
        ? {
            OR: [
              {
                referralsSent: {
                  some: {
                    currentStage: query.referralStatus,
                  },
                },
              },
              {
                referralsReceived: {
                  some: {
                    currentStage: query.referralStatus,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [totalItems, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          email: true,
          status: true,
          country: true,
          createdAt: true,
          subscriptions: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              status: true,
              plan: {
                select: {
                  tier: true,
                  name: true,
                },
              },
            },
          },
          referralsSent: {
            select: {
              currentStage: true,
            },
          },
          referralsReceived: {
            select: {
              currentStage: true,
            },
          },
        },
      }),
    ]);

    const userIds = users.map((user) => user.id);

    const [
      masterWallets,
      websiteWalletRows,
      creditUsageRows,
      verifiedAssetRows,
    ] = userIds.length
      ? await Promise.all([
          this.prisma.userCreditWallet.findMany({
            where: {
              userId: {
                in: userIds,
              },
            },
            select: {
              userId: true,
              subscriptionTaskCredits: true,
              earnedTaskCredits: true,
              purchasedTaskCredits: true,
              referralTaskCredits: true,
              visibilityCredits: true,
            },
          }),
          this.prisma.$queryRaw<
            Array<{
              userId: string;
              subscriptionTaskCredits: number | null;
              earnedTaskCredits: number | null;
              allocatedPurchasedCredits: number | null;
              allocatedReferralCredits: number | null;
              visibilityCredits: number | null;
            }>
          >(Prisma.sql`
            SELECT
              site."authorId" AS "userId",
              COALESCE(SUM(wallet."subscriptionTaskCredits"), 0)::int AS "subscriptionTaskCredits",
              COALESCE(SUM(wallet."earnedTaskCredits"), 0)::int AS "earnedTaskCredits",
              COALESCE(SUM(wallet."allocatedPurchasedCredits"), 0)::int AS "allocatedPurchasedCredits",
              COALESCE(SUM(wallet."allocatedReferralCredits"), 0)::int AS "allocatedReferralCredits",
              COALESCE(SUM(wallet."visibilityCredits"), 0)::int AS "visibilityCredits"
            FROM "WebsiteCreditWallet" wallet
            INNER JOIN "Website" site ON site."id" = wallet."websiteId"
            WHERE site."authorId" IN (${Prisma.join(userIds)})
              AND site."isDeleted" = false
            GROUP BY site."authorId"
          `),
          this.prisma.creditLog.groupBy({
            by: ['userId', 'action'],
            where: {
              userId: {
                in: userIds,
              },
              action: {
                in: ['SPEND', 'REFUND'],
              },
            },
            _sum: {
              amount: true,
            },
          }),
          this.prisma.website.groupBy({
            by: ['authorId'],
            where: {
              authorId: {
                in: userIds,
              },
              isDeleted: false,
              verificationStatus: 'VERIFIED',
            },
            _count: {
              _all: true,
            },
          }),
        ])
      : [[], [], [], []];

    const masterWalletByUserId = new Map(
      masterWallets.map((wallet) => [wallet.userId, wallet]),
    );
    const websiteWalletByUserId = new Map(
      websiteWalletRows.map((wallet) => [wallet.userId, wallet]),
    );
    const verifiedAssetCountByUserId = new Map(
      verifiedAssetRows.map((row) => [row.authorId, row._count._all]),
    );

    const creditUsageByUserId = new Map<
      string,
      { spent: number; refunded: number }
    >();

    for (const row of creditUsageRows) {
      const current = creditUsageByUserId.get(row.userId) ?? {
        spent: 0,
        refunded: 0,
      };
      const amount = row._sum.amount ?? 0;

      if (row.action === 'SPEND') {
        current.spent += amount;
      }

      if (row.action === 'REFUND') {
        current.refunded += amount;
      }

      creditUsageByUserId.set(row.userId, current);
    }

    const items = users.map((user, index) => {
      const masterWallet = masterWalletByUserId.get(user.id);
      const websiteWallet = websiteWalletByUserId.get(user.id);
      const creditUsage = creditUsageByUserId.get(user.id) ?? {
        spent: 0,
        refunded: 0,
      };
      const allowedCredits =
        (masterWallet?.subscriptionTaskCredits ?? 0) +
        (masterWallet?.earnedTaskCredits ?? 0) +
        (masterWallet?.purchasedTaskCredits ?? 0) +
        (masterWallet?.referralTaskCredits ?? 0) +
        (masterWallet?.visibilityCredits ?? 0) +
        (websiteWallet?.subscriptionTaskCredits ?? 0) +
        (websiteWallet?.earnedTaskCredits ?? 0) +
        (websiteWallet?.allocatedPurchasedCredits ?? 0) +
        (websiteWallet?.allocatedReferralCredits ?? 0) +
        (websiteWallet?.visibilityCredits ?? 0);
      const usedCredits = Math.max(creditUsage.spent - creditUsage.refunded, 0);
      const latestSubscription = user.subscriptions[0];
      const referralStages = [
        ...user.referralsSent.map((referral) => referral.currentStage),
        ...user.referralsReceived.map((referral) => referral.currentStage),
      ];

      return {
        id: user.id,
        userNumber: this.formatRegistryUserNumber(skip + index + 1),
        emailIdentity: user.email,
        accountType: latestSubscription?.plan.tier ?? null,
        accountTypeLabel: latestSubscription?.plan.name ?? 'No active plan',
        governanceStatus: user.status,
        country: user.country,
        assets: {
          verified: verifiedAssetCountByUserId.get(user.id) ?? 0,
        },
        credits: {
          used: usedCredits,
          allowed: allowedCredits,
          available: Math.max(allowedCredits - usedCredits, 0),
          displayValue: this.formatCreditDisplay(allowedCredits),
        },
        referral: {
          total: referralStages.length,
          statuses: referralStages,
        },
        authorityAction: {
          label: 'VIEW PROFILE',
          profileEndpoint: `/admin-user/registry/${user.id}`,
        },
        registeredAt: user.createdAt,
      };
    });

    return sendResponse('User registry fetched successfully', {
      items,
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

  async getRegistry(query: AdminUserRegistryQueryDto) {
    return this.getUserRegistry({
      page: query.page,
      limit: query.limit,
      search: query.searchByEmail ?? query.email ?? query.search,
      subscriptionTier: query.subscriptionTier,
      status: query.status,
      referralStatus: query.referralStatus as ReferralStage,
    });
  }

  async getUserRegistryProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isDeleted: false,
        role: UserRole.USER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        country: true,
        companyName: true,
        companyWebsite: true,
        companyIndustry: true,
        businessType: true,
        createdAt: true,
        creditWallet: {
          select: {
            subscriptionTaskCredits: true,
            earnedTaskCredits: true,
            purchasedTaskCredits: true,
            referralTaskCredits: true,
            visibilityCredits: true,
          },
        },
        subscriptions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            plan: {
              select: {
                id: true,
                tier: true,
                name: true,
                credit: true,
                visibility: true,
                billingInterval: true,
              },
            },
          },
        },
        websites: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
            name: true,
            websiteUrl: true,
            verificationStatus: true,
            country: true,
            creditWallet: {
              select: {
                subscriptionTaskCredits: true,
                earnedTaskCredits: true,
                allocatedPurchasedCredits: true,
                allocatedReferralCredits: true,
                visibilityCredits: true,
              },
            },
          },
        },
        referralsSent: {
          select: {
            id: true,
            currentStage: true,
            codeUsed: true,
            signedUpAt: true,
          },
        },
        referralsReceived: {
          select: {
            id: true,
            currentStage: true,
            codeUsed: true,
            signedUpAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const creditUsageRows = await this.prisma.creditLog.groupBy({
      by: ['action'],
      where: {
        userId,
        action: {
          in: ['SPEND', 'REFUND'],
        },
      },
      _sum: {
        amount: true,
      },
    });

    const governanceNotes = await this.getInternalGovernanceNotes(userId);

    const creditUsage = creditUsageRows.reduce(
      (summary, row) => {
        const amount = row._sum.amount ?? 0;

        if (row.action === 'SPEND') {
          summary.spent += amount;
        }

        if (row.action === 'REFUND') {
          summary.refunded += amount;
        }

        return summary;
      },
      { spent: 0, refunded: 0 },
    );

    const masterAllowed =
      (user.creditWallet?.subscriptionTaskCredits ?? 0) +
      (user.creditWallet?.earnedTaskCredits ?? 0) +
      (user.creditWallet?.purchasedTaskCredits ?? 0) +
      (user.creditWallet?.referralTaskCredits ?? 0) +
      (user.creditWallet?.visibilityCredits ?? 0);

    const websiteAllowed = user.websites.reduce((total, website) => {
      return (
        total +
        (website.creditWallet?.subscriptionTaskCredits ?? 0) +
        (website.creditWallet?.earnedTaskCredits ?? 0) +
        (website.creditWallet?.allocatedPurchasedCredits ?? 0) +
        (website.creditWallet?.allocatedReferralCredits ?? 0) +
        (website.creditWallet?.visibilityCredits ?? 0)
      );
    }, 0);

    const allowedCredits = masterAllowed + websiteAllowed;
    const usedCredits = Math.max(creditUsage.spent - creditUsage.refunded, 0);
    const verifiedAssets = user.websites.filter(
      (website) => website.verificationStatus === 'VERIFIED',
    ).length;
    const latestSubscription = user.subscriptions[0] ?? null;
    const linkedWebsites = user.websites.length;
    const referralActivity =
      user.referralsSent.length > 0
        ? 'REFERRER'
        : user.referralsReceived.length > 0
          ? 'REFERRED'
          : 'NONE';
    const subscriptionTier = latestSubscription
      ? `${latestSubscription.plan.tier} (${latestSubscription.plan.billingInterval})`
      : 'NO ACTIVE PLAN';
    const totalBalanceProgress =
      allowedCredits > 0
        ? Math.min(Math.round((usedCredits / allowedCredits) * 100), 100)
        : 0;

    return sendResponse('User registry profile fetched successfully', {
      oversight: {
        title: `${this.formatOversightUserCode(user.id)} OVERSIGHT`,
        subtitle: 'INSTITUTIONAL PROFILE REGISTRY',
        accountStatus: user.status,
        authorityClearance: 'STANDARD REGISTRY ACCESS',
        primaryEmail: user.email,
        countryOfOrigin: user.country,
        registrationDate: user.createdAt,
        subscriptionTier,
        institutionalAssets: {
          linkedWebsites,
          verifiedWebsites: verifiedAssets,
          referralActivity,
        },
        creditReserves: {
          totalBalance: allowedCredits,
          used: usedCredits,
          available: Math.max(allowedCredits - usedCredits, 0),
          displayValue: this.formatCreditDisplay(allowedCredits),
          progressPercent: totalBalanceProgress,
          readOnly: true,
        },
        governanceNotes,
      },
      user: {
        id: user.id,
        name: user.name,
        emailIdentity: user.email,
        governanceStatus: user.status,
        country: user.country,
        companyName: user.companyName,
        companyWebsite: user.companyWebsite,
        companyIndustry: user.companyIndustry,
        businessType: user.businessType,
        registeredAt: user.createdAt,
      },
      subscription: latestSubscription,
      assets: {
        total: user.websites.length,
        verified: verifiedAssets,
        websites: user.websites,
      },
      credits: {
        used: usedCredits,
        allowed: allowedCredits,
        available: Math.max(allowedCredits - usedCredits, 0),
        displayValue: this.formatCreditDisplay(allowedCredits),
        masterWallet: user.creditWallet,
        websiteWalletTotal: websiteAllowed,
      },
      referral: {
        sent: user.referralsSent,
        received: user.referralsReceived,
      },
    });
  }

  async getRegistryProfile(userId: string) {
    return this.getUserRegistryProfile(userId);
  }

  async suspendUserFromRegistry(
    userId: string,
    adminId: string,
    payload: SuspendUserDto,
  ) {
    const response = await this.suspendUser(userId, payload);

    const note = `SUSPEND ACCOUNT: ${payload.reason}. Duration: ${payload.durationInDays} day(s).`;
    await this.appendInternalGovernanceNote(userId, adminId, note);

    return sendResponse('User suspended from registry profile successfully', {
      action: 'SUSPEND_ACCOUNT',
      userId,
      status: 'SUSPENDED',
      message: response.message,
    });
  }

  async banUserFromRegistry(
    userId: string,
    adminId: string,
    payload: BanUserDto,
  ) {
    const response = await this.banUser(userId, payload);

    await this.appendInternalGovernanceNote(
      userId,
      adminId,
      `BAN ACCOUNT: ${payload.reason}.`,
    );

    return sendResponse('User banned from registry profile successfully', {
      action: 'BAN_ACCOUNT',
      userId,
      status: 'BANNED',
      message: response.message,
    });
  }

  async resetPasswordFromRegistry(
    userId: string,
    adminId: string,
    payload: AdminRegistryActionDto,
  ) {
    const user = await this.getActiveUserOrThrow(userId);
    const { otp, otpExpiry } = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.otpToken.deleteMany({
        where: {
          email: user.email,
          type: 'PASSWORD_RESET',
          usedAt: null,
        },
      });

      await tx.otpToken.create({
        data: {
          email: user.email,
          tokenHash: otpHash,
          type: 'PASSWORD_RESET',
          expiresAt: otpExpiry,
        },
      });
    });

    this.mail.sendPasswordResetEmail(user.email, {
      name: user.name,
      otp,
    });

    await this.appendInternalGovernanceNote(
      userId,
      adminId,
      `RESET PASSWORD: Password reset email sent.${payload.reason ? ` Reason: ${payload.reason}` : ''}`,
    );

    return sendResponse('Password reset email sent successfully', {
      action: 'RESET_PASSWORD',
      userId,
      email: user.email,
      expiresAt: otpExpiry,
    });
  }

  async resetPasswordByAdmin(
    userId: string,
    adminId: string,
    payload: AdminRegistryActionDto = {},
  ) {
    return this.resetPasswordFromRegistry(userId, adminId, payload);
  }

  async forceLogoutFromRegistry(
    userId: string,
    adminId: string,
    payload: AdminRegistryActionDto,
  ) {
    await this.getActiveUserOrThrow(userId);

    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId,
        logoutAt: null,
      },
      select: {
        id: true,
      },
    });

    await this.prisma.session.updateMany({
      where: {
        userId,
        logoutAt: null,
      },
      data: {
        logoutAt: new Date(),
      },
    });

    for (const session of activeSessions) {
      this.messagingGateway.disconnectSession(
        session.id,
        'Force logged out by admin',
      );
    }

    await this.appendInternalGovernanceNote(
      userId,
      adminId,
      `FORCE LOGOUT: ${activeSessions.length} active session(s) revoked.${payload.reason ? ` Reason: ${payload.reason}` : ''}`,
    );

    return sendResponse('User sessions force logged out successfully', {
      action: 'FORCE_LOGOUT',
      userId,
      revokedSessions: activeSessions.length,
    });
  }

  async forceLogoutByAdmin(
    userId: string,
    adminId: string,
    payload: AdminRegistryActionDto = {},
  ) {
    return this.forceLogoutFromRegistry(userId, adminId, payload);
  }

  async appendGovernanceNote(
    userId: string,
    adminId: string,
    payload: AppendGovernanceNoteDto | AdminUserGovernanceNoteDto,
  ) {
    await this.getActiveUserOrThrow(userId);

    const note = await this.appendInternalGovernanceNote(
      userId,
      adminId,
      payload.note,
    );

    return sendResponse('Governance note appended successfully', {
      action: 'APPEND_GOVERNANCE_NOTE',
      userId,
      note,
    });
  }

  async findAll(
    page = 1,
    limit = 10,
    filter?: {
      status?: UserStatus;
      role?: UserRole;
    },
    search?: string,
  ) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const skip = (safePage - 1) * safeLimit;

    const normalizedSearch = search?.trim();

    const where: Prisma.UserWhereInput = {
      isDeleted: false,

      ...(filter?.status && {
        status: filter.status,
      }),

      ...(filter?.role && {
        role: filter.role,
      }),

      ...(normalizedSearch && {
        OR: [
          {
            name: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [totalItems, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),

      this.prisma.user.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          email: true,
          country: true,
          status: true,
          role: true,
          imageKey: true,
          registrationTime: true,
          createdAt: true,

          creditWallet: {
            select: {
              subscriptionTaskCredits: true,
              earnedTaskCredits: true,
              purchasedTaskCredits: true,
              referralTaskCredits: true,
              visibilityCredits: true,
            },
          },

          websites: {
            select: {
              id: true,
              verificationStatus: true,
              isDeleted: true,
            },
          },

          subscriptions: {
            where: {
              status: 'ACTIVE',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              status: true,
              plan: {
                select: {
                  id: true,
                  tier: true,
                  name: true,
                  credit: true,
                  taskCreditsPerCycle: true,
                  maxTaskCreditCapacity: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const data = await Promise.all(
      users.map(async (user, index) => {
        const creditUsed = await this.prisma.creditLog.aggregate({
          where: {
            userId: user.id,
            action: 'SPEND',
          },
          _sum: {
            amount: true,
          },
        });

        const wallet = user.creditWallet;

        const allowedCredits =
          (wallet?.subscriptionTaskCredits ?? 0) +
          (wallet?.earnedTaskCredits ?? 0) +
          (wallet?.purchasedTaskCredits ?? 0) +
          (wallet?.referralTaskCredits ?? 0);

        const totalAssets = user.websites.filter(
          (website) => !website.isDeleted,
        ).length;

        const verifiedAssets = user.websites.filter(
          (website) =>
            !website.isDeleted && website.verificationStatus === 'VERIFIED',
        ).length;

        const activeSubscription = user.subscriptions[0] ?? null;

        let imageUrl: string | null = null;

        if (user.imageKey) {
          imageUrl = (await this.s3.getDownloadUrl(user.imageKey)).downloadUrl;
        }

        return {
          user: {
            id: user.id,
            displayId: `USER ${String(skip + index + 1).padStart(3, '0')}`,
            name: user.name,
            email: user.email,
            imageUrl,
            registrationTime: user.registrationTime,
            createdAt: user.createdAt,
          },

          account: {
            type: activeSubscription?.plan.tier ?? 'FREE',
            subscriptionId: activeSubscription?.id ?? null,
            planName: activeSubscription?.plan.name ?? null,
            role: user.role,
          },

          governance: {
            status: user.status,
            isActive: user.status === UserStatus.ACTIVE,
          },

          country: user.country,

          assets: {
            total: totalAssets,
            verified: verifiedAssets,
          },

          credits: {
            used: creditUsed._sum.amount ?? 0,
            allowed: allowedCredits,
            wallet,
          },
        };
      }),
    );

    return sendResponse('Users fetched successfully', {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages: Math.ceil(totalItems / safeLimit),
        hasNextPage: safePage * safeLimit < totalItems,
        hasPreviousPage: safePage > 1,
      },
    });
  }

  async forceLogoutUser(userId: string) {
    const user = await this.getActiveUserOrThrow(userId);

    const result = await this.prisma.session.updateMany({
      where: {
        userId: user.id,
        logoutAt: null,
      },
      data: {
        logoutAt: new Date(),
      },
    });

    return sendResponse('User force logged out successfully', {
      userId: user.id,
      loggedOutSessions: result.count,
    });
  }
}
