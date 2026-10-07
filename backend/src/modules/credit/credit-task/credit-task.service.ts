import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreditReason, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreditWalletTypeDtoEnum,
  DeductTaskCreditDto,
  RefundTaskCreditDto,
  RewardProviderCreditDto,
} from './dto/task-credit.dto';
import { createCreditNotificationIfAllowed } from '../utils/credit-notification.util';

type DbClient = PrismaService | Prisma.TransactionClient;

type TaskCreditContext = {
  id: string;
  requesterId: string;
  requesterWebsiteId: string;
  selectedProviderId: string | null;
  lifecycleStatus: string;
  submissionStatus: string;
  creditCost: number | null;
  reservedCreditAmount: number | null;
  walletType: string | null;
  isDirectTaskRequest?: boolean;
};

type UserWalletSnapshot = {
  id: string;
  userId: string;
};

type WebsiteWalletSnapshot = {
  id: string;
  websiteId: string;
  subscriptionTaskCredits: number;
  earnedTaskCredits: number;
  allocatedPurchasedCredits: number;
  allocatedReferralCredits: number;
};

type WebsiteWalletBalanceColumn =
  | 'subscriptionTaskCredits'
  | 'allocatedPurchasedCredits'
  | 'allocatedReferralCredits'
  | 'earnedTaskCredits';

type WalletSnapshot = {
  id: string;
  userId: string;
  earnedTaskCredits: number;
};

type ActiveSubscriptionBatch = {
  id: string;
  subscriptionId: string | null;
  remainingCredits: number;
  expiresAt: Date;
};

type AddEarnedTaskCreditInput = {
  userId: string;
  amount: number;
  reason: CreditReason;
  websiteId: string;
  actorId?: string | null;
  taskId?: string;
  referralId?: string;
  subscriptionId?: string;
  note?: string;
};

@Injectable()
export class CreditTaskService {
  private readonly logger = new Logger(CreditTaskService.name);

  constructor(private readonly prisma: PrismaService) { }

  async deductTaskCredit(actorUserId: string, body: DeductTaskCreditDto) {
    this.ensurePositiveCreditAmount(body.creditAmount);

    if (!body.walletType) {
      throw new BadRequestException(
        'walletType is required. Use SUBSCRIPTION, PURCHASED, REFERRAL or EARNED.',
      );
    }
    const walletType = body.walletType;

    const task = await this.getTaskCreditContext(body.taskId);
    this.ensureRequesterActor(actorUserId, body.userId, task);

    if (body.requesterWebsiteId !== task.requesterWebsiteId) {
      throw new ForbiddenException(
        'Provided requesterWebsiteId does not match the task requester website.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const masterWallet = await this.getOrCreateUserWallet(
        tx,
        task.requesterId,
      );
      const websiteWallet = await this.getOrCreateWebsiteWallet(
        tx,
        task.requesterWebsiteId,
      );

      const sourceColumn = this.resolveWebsiteWalletSource(walletType);
      const balanceBefore = websiteWallet[sourceColumn];

      if (balanceBefore < body.creditAmount) {
        throw new BadRequestException(
          `Insufficient ${walletType.toLowerCase()} task credits.`,
        );
      }

      const updatedWebsite = await this.updateWebsiteWalletBalance(
        tx,
        task.requesterWebsiteId,
        sourceColumn,
        -body.creditAmount,
      );

      await tx.creditLog.create({
        data: {
          walletId: masterWallet.id,
          userId: task.requesterId,
          websiteId: task.requesterWebsiteId,
          taskId: task.isDirectTaskRequest ? null : task.id,
          directTaskRequestId: task.isDirectTaskRequest ? task.id : null,
          creditType: this.resolveCreditType(walletType),
          action: 'SPEND',
          reason: 'TASK_POST',
          amount: body.creditAmount,
          balanceBefore,
          balanceAfter: updatedWebsite[sourceColumn],
          note: this.resolveWalletNote(walletType, 'SPEND', body.note),
        },
      });

      await this.createCreditNotification(tx, {
        recipientId: task.requesterId,
        actorId: actorUserId,
        type: NotificationType.CREDIT_DEDUCTED,
        title: 'Task credits deducted',
        body: `${body.creditAmount} ${walletType.toLowerCase()} task credit(s) were reserved for your task.`,
        amount: body.creditAmount,
        websiteId: task.requesterWebsiteId,
        taskId: task.isDirectTaskRequest ? null : task.id,
        directTaskRequestId: task.isDirectTaskRequest ? task.id : null,
        walletType,
        balanceBefore,
        balanceAfter: updatedWebsite[sourceColumn],
        idempotencyKey: [
          'credit-deducted',
          task.id,
          task.requesterId,
          walletType,
          body.creditAmount,
        ].join('-'),
      });

      return {
        success: true,
        source: walletType,
        deducted: body.creditAmount,
        requesterWebsiteId: task.requesterWebsiteId,
      };
    });
  }

  async refundTaskCredit(actorUserId: string, body: RefundTaskCreditDto) {
    this.ensurePositiveCreditAmount(body.creditAmount);

    if (!body.walletType) {
      throw new BadRequestException(
        'walletType is required. Use SUBSCRIPTION, PURCHASED, REFERRAL or EARNED.',
      );
    }
    const walletType = body.walletType;

    const task = await this.getTaskCreditContext(body.taskId);
    this.ensureRequesterActor(actorUserId, body.userId, task);

    if (body.requesterWebsiteId !== task.requesterWebsiteId) {
      throw new ForbiddenException(
        'Provided requesterWebsiteId does not match the task requester website.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const masterWallet = await this.getOrCreateUserWallet(
        tx,
        task.requesterId,
      );
      const websiteWallet = await this.getOrCreateWebsiteWallet(
        tx,
        task.requesterWebsiteId,
      );

      const sourceColumn = this.resolveWebsiteWalletSource(walletType);
      const balanceBefore = websiteWallet[sourceColumn];

      const updatedWebsite = await this.updateWebsiteWalletBalance(
        tx,
        task.requesterWebsiteId,
        sourceColumn,
        body.creditAmount,
      );

      await tx.creditLog.create({
        data: {
          walletId: masterWallet.id,
          userId: task.requesterId,
          websiteId: task.requesterWebsiteId,
          taskId: task.isDirectTaskRequest ? null : task.id,
          directTaskRequestId: task.isDirectTaskRequest ? task.id : null,
          creditType: this.resolveCreditType(walletType),
          action: 'REFUND',
          reason: 'TASK_POST',
          amount: body.creditAmount,
          balanceBefore,
          balanceAfter: updatedWebsite[sourceColumn],
          note: this.resolveWalletNote(walletType, 'REFUND', body.note),
        },
      });

      await this.createCreditNotification(tx, {
        recipientId: task.requesterId,
        actorId: actorUserId,
        type: NotificationType.CREDIT_REFUNDED,
        title: 'Task credits refunded',
        body: `${body.creditAmount} ${walletType.toLowerCase()} task credit(s) were refunded to your website wallet.`,
        amount: body.creditAmount,
        websiteId: task.requesterWebsiteId,
        taskId: task.isDirectTaskRequest ? null : task.id,
        directTaskRequestId: task.isDirectTaskRequest ? task.id : null,
        walletType,
        balanceBefore,
        balanceAfter: updatedWebsite[sourceColumn],
        idempotencyKey: [
          'credit-refunded',
          task.id,
          task.requesterId,
          walletType,
          body.creditAmount,
        ].join('-'),
      });

      return {
        success: true,
        refundedTo: walletType,
        amount: body.creditAmount,
        requesterWebsiteId: task.requesterWebsiteId,
      };
    });
  }

  /**
   * Deterministic credit reconciliation for a REJECTED submission (spec §24).
   * Refunds the requester the originally-deducted task credit using a dedicated
   * `REJECTED_TASK` reason discriminator so the adjustment is auditable and
   * distinct from a generic cancel refund. Idempotent per task via the
   * `creditLog` check, guarding against double refunds on re-review.
   */
  async handleRejectedTaskCredit(
    actorUserId: string,
    providerWebsiteId: string | null,
    taskId: string,
    amount?: number,
  ): Promise<void> {
    const task = await this.getTaskCreditContext(taskId);

    const existing = await this.prisma.creditLog.findFirst({
      where: {
        OR: [{ taskId }, { directTaskRequestId: taskId }],
        websiteId: task.requesterWebsiteId,
        action: 'REFUND',
        reason: 'REJECTED_TASK',
      },
      select: { id: true },
    });
    if (existing) {
      return; // already reconciled — no double refund
    }

    const walletType = this.resolveStoredWalletType(task.walletType);
    const refundAmount =
      amount ?? task.creditCost ?? task.reservedCreditAmount ?? 0;
    if (refundAmount <= 0) {
      return;
    }

    try {
      await this.refundTaskCredit(actorUserId, {
        taskId,
        requesterWebsiteId: task.requesterWebsiteId,
        creditAmount: refundAmount,
        walletType,
        note: 'Requester credit refunded on submission rejection',
      });
    } catch {
      // Refund may fail if wallet was already reconciled; swallow to stay
      // idempotent rather than blocking the rejection flow.
    }
    void providerWebsiteId;
  }

  /**
   * Deterministic credit reconciliation for a FAILED task (terminal failure,
   * not a requester rejection). Refunds the requester the originally-deducted
   * task credit using a dedicated `FAILED_TASK` reason discriminator. Idempotent
   * per task via the `creditLog` check.
   */
  async handleFailedTaskCredit(
    actorUserId: string,
    providerWebsiteId: string,
    taskId: string,
    amount?: number,
  ): Promise<void> {
    const task = await this.getTaskCreditContext(taskId);

    const existing = await this.prisma.creditLog.findFirst({
      where: {
        taskId,
        websiteId: task.requesterWebsiteId,
        action: 'REFUND',
        reason: 'FAILED_TASK',
      },
      select: { id: true },
    });
    if (existing) {
      return; // already reconciled — no double refund
    }

    const walletType = this.resolveStoredWalletType(task.walletType);
    const refundAmount =
      amount ?? task.creditCost ?? task.reservedCreditAmount ?? 0;
    if (refundAmount <= 0) {
      return;
    }

    try {
      await this.refundTaskCredit(actorUserId, {
        taskId,
        requesterWebsiteId: task.requesterWebsiteId,
        creditAmount: refundAmount,
        walletType,
        note: 'Requester credit refunded on task failure',
      });
    } catch {
      // Swallow to stay idempotent rather than blocking the failure flow.
    }
    void providerWebsiteId;
  }

  private resolveStoredWalletType(
    walletType?: string | null,
  ): CreditWalletTypeDtoEnum {
    if (walletType && walletType in CreditWalletTypeDtoEnum) {
      return CreditWalletTypeDtoEnum[
        walletType as keyof typeof CreditWalletTypeDtoEnum
      ];
    }
    return CreditWalletTypeDtoEnum.SUBSCRIPTION;
  }

  async rewardProviderCredit(
    actorUserId: string,
    body: RewardProviderCreditDto,
    tx?: Prisma.TransactionClient,
  ) {
    // Step 1: reward amount must be a valid positive credit value.
    this.ensurePositiveCreditAmount(body.creditAmount);
    const db = tx ?? this.prisma;

    // Step 2: load task context and resolve the final provider user for this task.
    const task = await this.getTaskCreditContext(body.taskId);
    const providerId = this.resolveProviderActor(task, body.providerId);
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { role: true },
    });
    const isAdminActor = actor?.role === 'ADMIN';

    // Step 3: requester, selected provider, or admin can force-record this reward.
    if (
      !isAdminActor &&
      actorUserId !== task.requesterId &&
      actorUserId !== providerId
    ) {
      throw new ForbiddenException(
        'Only the requester, selected provider, or admin can record provider reward credits for this task.',
      );
    }

    // Step 4: make sure the provider website really belongs to the resolved provider user.
    await this.ensureWebsiteOwnedByUser(providerId, body.providerWebsiteId, db);

    // Step 5: block duplicate reward for the same task/provider/website combination.
    const existingReward = await db.creditLog.findFirst({
      where: {
        userId: providerId,
        websiteId: body.providerWebsiteId,
        taskId: task.id,
        creditType: 'EARNED_TASK',
        action: 'REWARD',
        reason: 'TASK_COMPLETION',
      },
      select: { id: true },
    });

    if (existingReward) {
      throw new BadRequestException(
        'Provider reward has already been recorded for this task.',
      );
    }

    // Step 6: add earned credits to the provider website wallet and write the reward log.
    return this.addEarnedTaskCredit(
      {
        userId: providerId,
        websiteId: body.providerWebsiteId,
        amount: body.creditAmount,
        reason: 'TASK_COMPLETION',
        taskId: task.id,
        note: this.resolveNote(
          body.note,
          'Provider earned task credit after task completion',
        ),
        actorId: actorUserId,
      },
      tx,
    );
  }

  async addEarnedTaskCredit(
    input: AddEarnedTaskCreditInput,
    tx?: Prisma.TransactionClient,
  ) {
    this.ensurePositiveCreditAmount(input.amount);
    const db = tx ?? this.prisma;

    await this.ensureWebsiteOwnedByUser(input.userId, input.websiteId, db);
    const masterWallet = await this.getOrCreateUserWallet(db, input.userId);
    const websiteWallet = await this.getOrCreateWebsiteWallet(
      db,
      input.websiteId,
    );

    const updatedWebsite = await this.updateWebsiteWalletBalance(
      db,
      input.websiteId,
      'earnedTaskCredits',
      input.amount,
    );

    await db.creditLog.create({
      data: {
        walletId: masterWallet.id,
        userId: input.userId,
        websiteId: input.websiteId,
        taskId: input.taskId,
        referralId: input.referralId,
        subscriptionId: input.subscriptionId,
        creditType: 'EARNED_TASK',
        action: 'REWARD',
        reason: input.reason,
        amount: input.amount,
        balanceBefore: websiteWallet.earnedTaskCredits,
        balanceAfter: updatedWebsite.earnedTaskCredits,
        note: input.note,
      },
    });

    await this.createCreditNotification(db, {
      recipientId: input.userId,
      actorId: input.actorId,
      type: NotificationType.CREDIT_REWARDED,
      title: 'Task credits added',
      body: `${input.amount} earned task credit(s) were added to your website wallet.`,
      amount: input.amount,
      websiteId: input.websiteId,
      taskId: input.taskId ?? null,
      walletType: CreditWalletTypeDtoEnum.EARNED,
      balanceBefore: websiteWallet.earnedTaskCredits,
      balanceAfter: updatedWebsite.earnedTaskCredits,
      idempotencyKey: [
        'credit-rewarded',
        input.reason,
        input.userId,
        input.websiteId,
        input.taskId ?? input.referralId ?? input.subscriptionId ?? 'manual',
        input.amount,
      ].join('-'),
    });

    return updatedWebsite;
  }

  private async createCreditNotification(
    db: DbClient,
    input: Parameters<typeof createCreditNotificationIfAllowed>[1],
  ) {
    try {
      await createCreditNotificationIfAllowed(db, input);
    } catch (error) {
      this.logger.warn(
        `Credit notification skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private ensurePositiveCreditAmount(creditAmount: number) {
    if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
      throw new BadRequestException('creditAmount must be greater than zero');
    }
  }

  private async getTaskCreditContext(
    taskId: string,
  ): Promise<TaskCreditContext> {
    let task: any = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        requesterId: true,
        requesterWebsiteId: true,
        selectedProviderId: true,
        lifecycleStatus: true,
        submissionStatus: true,
        creditCost: true,
        reservedCreditAmount: true,
        walletType: true,
      },
    });

    if (!task) {
      const directRequest = await this.prisma.directTaskRequest.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          requesterId: true,
          requesterWebsiteId: true,
          status: true,
        },
      });

      if (directRequest) {
        task = {
          ...directRequest,
          selectedProviderId: null,
          lifecycleStatus: 'OPEN',
          submissionStatus: null,
          creditCost: 1,
          reservedCreditAmount: 0,
          walletType: null,
          isDirectTaskRequest: true,
        };
      }
    }

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    return task;
  }

  private ensureRequesterActor(
    actorUserId: string,
    requestedUserId: string | undefined,
    task: TaskCreditContext,
  ) {
    if (requestedUserId && requestedUserId !== task.requesterId) {
      throw new ForbiddenException(
        'Provided userId does not match the task requester.',
      );
    }

    if (actorUserId !== task.requesterId) {
      throw new ForbiddenException(
        'Only the requester can spend or refund task credits for this task.',
      );
    }
  }

  private resolveProviderActor(
    task: TaskCreditContext,
    requestedProviderId?: string,
  ) {
    if (!task.selectedProviderId) {
      throw new BadRequestException(
        'No selected provider found for this task.',
      );
    }

    if (
      requestedProviderId &&
      requestedProviderId !== task.selectedProviderId
    ) {
      throw new ForbiddenException(
        'Provided providerId does not match the selected provider for this task.',
      );
    }

    return task.selectedProviderId;
  }

  private async getOrCreateWallet(db: DbClient, userId: string) {
    const existingWallet = await db.userCreditWallet.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        earnedTaskCredits: true,
      },
    });

    if (existingWallet) return existingWallet;

    return db.userCreditWallet.create({
      data: {
        userId,
        earnedTaskCredits: 0,
        visibilityCredits: 0,
      },
      select: {
        id: true,
        userId: true,
        earnedTaskCredits: true,
      },
    });
  }

  private async getActiveSubscriptionBatches(userId: string) {
    return this.prisma.subscriptionCreditBatch.findMany({
      where: {
        userId,
        remainingCredits: { gt: 0 },
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
      select: {
        id: true,
        subscriptionId: true,
        remainingCredits: true,
        expiresAt: true,
      },
    });
  }

  private async deductFromEarnedWallet(
    tx: Prisma.TransactionClient,
    wallet: WalletSnapshot,
    task: TaskCreditContext,
    creditAmount: number,
    note?: string,
  ) {
    const currentWallet = await tx.userCreditWallet.findUnique({
      where: { userId: wallet.userId },
      select: {
        id: true,
        userId: true,
        earnedTaskCredits: true,
      },
    });

    if (!currentWallet) {
      throw new BadRequestException('Wallet not found');
    }

    if (currentWallet.earnedTaskCredits < creditAmount) {
      throw new BadRequestException('Insufficient earned task credits');
    }

    const updated = await tx.userCreditWallet.update({
      where: { userId: wallet.userId },
      data: {
        earnedTaskCredits: {
          decrement: creditAmount,
        },
      },
      select: {
        earnedTaskCredits: true,
      },
    });

    await tx.creditLog.create({
      data: {
        walletId: currentWallet.id,
        userId: wallet.userId,
        creditType: 'EARNED_TASK',
        action: 'SPEND',
        reason: 'TASK_POST',
        amount: creditAmount,
        balanceBefore: currentWallet.earnedTaskCredits,
        balanceAfter: updated.earnedTaskCredits,
        websiteId: task.requesterWebsiteId,
        taskId: task.isDirectTaskRequest ? null : task.id,
        directTaskRequestId: task.isDirectTaskRequest ? task.id : null,
        note: this.resolveNote(
          note,
          'Requester task credit deducted from earned wallet',
        ),
      },
    });
  }

  private async deductFromSubscriptionBatches(
    tx: Prisma.TransactionClient,
    walletId: string,
    task: TaskCreditContext,
    creditAmount: number,
    note: string | undefined,
    activeBatches: ActiveSubscriptionBatch[],
  ) {
    let remaining = creditAmount;

    for (const batch of activeBatches) {
      if (remaining <= 0) break;

      const deductAmount = Math.min(batch.remainingCredits, remaining);
      if (deductAmount <= 0) {
        continue;
      }

      const updated = await tx.subscriptionCreditBatch.update({
        where: { id: batch.id },
        data: {
          remainingCredits: {
            decrement: deductAmount,
          },
        },
        select: {
          remainingCredits: true,
        },
      });

      await tx.creditLog.create({
        data: {
          walletId,
          userId: task.requesterId,
          creditType: 'SUBSCRIPTION_TASK',
          action: 'SPEND',
          reason: 'TASK_POST',
          amount: deductAmount,
          balanceBefore: batch.remainingCredits,
          balanceAfter: updated.remainingCredits,
          websiteId: task.requesterWebsiteId,
          taskId: task.isDirectTaskRequest ? null : task.id,
          directTaskRequestId: task.isDirectTaskRequest ? task.id : null,
          subscriptionId: batch.subscriptionId,
          subscriptionCreditBatchId: batch.id,
          note: this.resolveNote(
            note,
            'Requester task credit deducted from subscription wallet',
          ),
        },
      });

      remaining -= deductAmount;
    }

    if (remaining > 0) {
      throw new BadRequestException('Insufficient subscription task credits');
    }

    return { success: true, source: 'SUBSCRIPTION', deducted: creditAmount };
  }

  private async getRefundableSubscriptionSources(
    userId: string,
    taskId: string,
  ) {
    const spendLogs = await this.prisma.creditLog.findMany({
      where: {
        userId,
        OR: [{ taskId }, { directTaskRequestId: taskId }],
        creditType: 'SUBSCRIPTION_TASK',
        action: 'SPEND',
        subscriptionCreditBatchId: {
          not: null,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        subscriptionCreditBatchId: true,
        subscriptionId: true,
        amount: true,
      },
    });

    if (spendLogs.length === 0) {
      return [];
    }

    const refundedLogs = await this.prisma.creditLog.findMany({
      where: {
        userId,
        OR: [{ taskId }, { directTaskRequestId: taskId }],
        creditType: 'SUBSCRIPTION_TASK',
        action: 'REFUND',
        subscriptionCreditBatchId: {
          not: null,
        },
      },
      select: {
        subscriptionCreditBatchId: true,
        amount: true,
      },
    });

    const refundedByBatch = new Map<string, number>();
    for (const row of refundedLogs) {
      const batchId = row.subscriptionCreditBatchId;
      if (!batchId) {
        continue;
      }

      refundedByBatch.set(
        batchId,
        (refundedByBatch.get(batchId) ?? 0) + row.amount,
      );
    }

    const spendByBatch = new Map<
      string,
      { subscriptionId: string | null; spent: number }
    >();
    for (const row of spendLogs) {
      const batchId = row.subscriptionCreditBatchId;
      if (!batchId) {
        continue;
      }

      const existing = spendByBatch.get(batchId);
      spendByBatch.set(batchId, {
        subscriptionId: row.subscriptionId ?? existing?.subscriptionId ?? null,
        spent: (existing?.spent ?? 0) + row.amount,
      });
    }

    const batches = await this.prisma.subscriptionCreditBatch.findMany({
      where: {
        id: {
          in: [...spendByBatch.keys()],
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        subscriptionId: true,
        remainingCredits: true,
        expiresAt: true,
      },
    });

    return batches
      .map((batch) => {
        const spent = spendByBatch.get(batch.id)?.spent ?? 0;
        const refunded = refundedByBatch.get(batch.id) ?? 0;
        return {
          ...batch,
          availableToRefund: Math.max(0, spent - refunded),
        };
      })
      .filter((batch) => batch.availableToRefund > 0)
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  }

  private resolveNote(note: string | undefined, fallback: string) {
    const trimmed = note?.trim();
    return trimmed ? trimmed : fallback;
  }

  private async getOrCreateUserWallet(db: DbClient, userId: string) {
    const existingWallet = await db.userCreditWallet.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (existingWallet) return existingWallet;

    return db.userCreditWallet.create({
      data: {
        userId,
        earnedTaskCredits: 0,
        visibilityCredits: 0,
      },
      select: {
        id: true,
        userId: true,
      },
    });
  }

  private async getOrCreateWebsiteWallet(db: DbClient, websiteId: string) {
    const existingWallet = await db.websiteCreditWallet.findUnique({
      where: { websiteId },
      select: {
        id: true,
        websiteId: true,
        subscriptionTaskCredits: true,
        earnedTaskCredits: true,
        allocatedPurchasedCredits: true,
        allocatedReferralCredits: true,
      },
    });

    if (existingWallet) return existingWallet;

    return db.websiteCreditWallet.create({
      data: {
        websiteId,
        subscriptionTaskCredits: 0,
        earnedTaskCredits: 0,
        allocatedPurchasedCredits: 0,
        allocatedReferralCredits: 0,
        visibilityCredits: 0,
      },
      select: {
        id: true,
        websiteId: true,
        subscriptionTaskCredits: true,
        earnedTaskCredits: true,
        allocatedPurchasedCredits: true,
        allocatedReferralCredits: true,
      },
    });
  }

  private async updateWebsiteWalletBalance(
    db: DbClient,
    websiteId: string,
    column: WebsiteWalletBalanceColumn,
    delta: number,
  ) {
    return await db.websiteCreditWallet.update({
      where: { websiteId },
      data: {
        [column]: {
          increment: delta,
        },
      },
      select: {
        id: true,
        websiteId: true,
        subscriptionTaskCredits: true,
        earnedTaskCredits: true,
        allocatedPurchasedCredits: true,
        allocatedReferralCredits: true,
      },
    });
  }

  private resolveWebsiteWalletSource(
    walletType: CreditWalletTypeDtoEnum,
  ): WebsiteWalletBalanceColumn {
    switch (walletType) {
      case CreditWalletTypeDtoEnum.SUBSCRIPTION:
        return 'subscriptionTaskCredits';
      case CreditWalletTypeDtoEnum.PURCHASED:
        return 'allocatedPurchasedCredits';
      case CreditWalletTypeDtoEnum.REFERRAL:
        return 'allocatedReferralCredits';
      case CreditWalletTypeDtoEnum.EARNED:
        return 'earnedTaskCredits';
    }
  }

  private resolveCreditType(walletType: CreditWalletTypeDtoEnum) {
    return walletType === CreditWalletTypeDtoEnum.SUBSCRIPTION
      ? 'SUBSCRIPTION_TASK'
      : 'EARNED_TASK';
  }

  private resolveWalletNote(
    walletType: CreditWalletTypeDtoEnum,
    action: 'SPEND' | 'REFUND',
    note?: string,
  ) {
    const fallbackByType = {
      SUBSCRIPTION: {
        SPEND:
          'Requester task credit deducted from website subscription wallet',
        REFUND: 'Requester task credit refunded to website subscription wallet',
      },
      PURCHASED: {
        SPEND: 'Requester task credit deducted from website purchased wallet',
        REFUND: 'Requester task credit refunded to website purchased wallet',
      },
      REFERRAL: {
        SPEND: 'Requester task credit deducted from website referral wallet',
        REFUND: 'Requester task credit refunded to website referral wallet',
      },
      EARNED: {
        SPEND: 'Requester task credit deducted from website earned wallet',
        REFUND: 'Requester task credit refunded to website earned wallet',
      },
    } as const;

    return this.resolveNote(note, fallbackByType[walletType][action]);
  }

  private async ensureWebsiteOwnedByUser(
    userId: string,
    websiteId: string,
    db: DbClient = this.prisma,
  ) {
    const website = await db.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
      },
    });

    if (!website || website.isDeleted) {
      throw new BadRequestException('Website not found');
    }

    if (website.authorId !== userId) {
      throw new ForbiddenException(
        'Provided website does not belong to the expected user.',
      );
    }

    return website;
  }
}
