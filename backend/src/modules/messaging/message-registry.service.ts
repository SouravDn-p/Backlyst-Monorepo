import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MessageRegistryStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;
type RegistryTriggerType =
  | 'MESSAGE_CREATED'
  | 'REPORT_CREATED'
  | 'REPORT_DELETED'
  | 'REPORT_UPDATED'
  | 'ADMIN_OVERRIDE'
  | 'RECOMPUTE';

@Injectable()
export class MessageRegistryService {
  private readonly logger = new Logger(MessageRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  getInitialRegistryState() {
    return {
      registryStatus: MessageRegistryStatus.VERIFIED,
      registryReason: null,
      registryUpdatedAt: null,
      registryUpdatedById: null,
      reportCount: 0,
      latestReportId: null,
      isManualOverride: false,
    } as const;
  }

  async updateFromReport(
    messageId: string,
    reportId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;

    const [message, report] = await Promise.all([
      db.message.findUnique({
        where: { id: messageId },
        select: {
          id: true,
          senderId: true,
          recipientId: true,
          taskId: true,
          registryStatus: true,
          reportCount: true,
          isManualOverride: true,
        },
      }),
      db.messageReport.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          messageId: true,
        },
      }),
    ]);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (!report || report.messageId !== messageId) {
      throw new NotFoundException('Message report not found');
    }

    const nextReportCount = message.reportCount + 1;
    const automaticStatus = this.deriveAutomaticStatus(nextReportCount);
    const nextStatus = message.isManualOverride
      ? message.registryStatus
      : automaticStatus;

    const updated = await db.message.update({
      where: { id: messageId },
      data: {
        reportCount: {
          increment: 1,
        },
        latestReportId: reportId,
        ...(message.isManualOverride
          ? {}
          : {
              registryStatus: nextStatus,
              registryReason: this.getAutomaticReason(nextReportCount),
              registryUpdatedAt: new Date(),
              registryUpdatedById: null,
            }),
      },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        taskId: true,
        registryStatus: true,
        reportCount: true,
        latestReportId: true,
        isManualOverride: true,
      },
    });

    this.logRegistryChange(
      message.id,
      message.registryStatus,
      updated.registryStatus,
      'REPORT_CREATED',
    );

    return updated;
  }

  async updateStatusManually(
    messageId: string,
    status: MessageRegistryStatus,
    adminId: string,
    reason?: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;

    const message = await db.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        taskId: true,
        registryStatus: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (
      (status === MessageRegistryStatus.FLAGGED ||
        status === MessageRegistryStatus.RESTRICTED) &&
      !reason?.trim()
    ) {
      throw new BadRequestException(
        'reason is required when registryStatus is FLAGGED or RESTRICTED',
      );
    }

    const updated = await db.message.update({
      where: { id: messageId },
      data: {
        registryStatus: status,
        registryReason: reason?.trim() || null,
        registryUpdatedAt: new Date(),
        registryUpdatedById: adminId,
        isManualOverride: true,
      },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        taskId: true,
        registryStatus: true,
        reportCount: true,
        latestReportId: true,
        isManualOverride: true,
      },
    });

    this.logRegistryChange(
      message.id,
      message.registryStatus,
      updated.registryStatus,
      'ADMIN_OVERRIDE',
    );

    return updated;
  }

  async recomputeRegistry(messageId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;

    const message = await db.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        taskId: true,
        registryStatus: true,
        isManualOverride: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const [reportCount, latestReport] = await Promise.all([
      db.messageReport.count({
        where: { messageId },
      }),
      db.messageReport.findFirst({
        where: { messageId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true },
      }),
    ]);

    const automaticStatus = this.deriveAutomaticStatus(reportCount);
    const nextStatus = message.isManualOverride
      ? message.registryStatus
      : automaticStatus;

    const updated = await db.message.update({
      where: { id: messageId },
      data: {
        reportCount,
        latestReportId: latestReport?.id ?? null,
        ...(message.isManualOverride
          ? {}
          : {
              registryStatus: nextStatus,
              registryReason: this.getAutomaticReason(reportCount),
              registryUpdatedAt: reportCount > 0 ? new Date() : null,
              registryUpdatedById: null,
            }),
      },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        taskId: true,
        registryStatus: true,
        reportCount: true,
        latestReportId: true,
        isManualOverride: true,
      },
    });

    this.logRegistryChange(
      message.id,
      message.registryStatus,
      updated.registryStatus,
      'RECOMPUTE',
    );

    return updated;
  }

  private deriveAutomaticStatus(reportCount: number) {
    if (reportCount >= 3) {
      return MessageRegistryStatus.RESTRICTED;
    }

    if (reportCount >= 1) {
      return MessageRegistryStatus.FLAGGED;
    }

    return MessageRegistryStatus.VERIFIED;
  }

  private getAutomaticReason(reportCount: number) {
    if (reportCount >= 3) {
      return 'Restricted after repeated user reports';
    }

    if (reportCount >= 1) {
      return 'Reported by user';
    }

    return null;
  }

  private logRegistryChange(
    messageId: string,
    previousStatus: MessageRegistryStatus,
    newStatus: MessageRegistryStatus,
    triggerType: RegistryTriggerType,
  ) {
    this.logger.log(
      JSON.stringify({
        messageId,
        previousStatus,
        newStatus,
        triggerType,
      }),
    );
  }
}
