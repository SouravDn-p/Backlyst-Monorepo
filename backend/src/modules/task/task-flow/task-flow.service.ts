import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  TaskFlowActorRole,
  TaskFlowEventType,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

export type RecordTaskFlowInput = {
  placementTaskId: string;
  requesterId: string;
  providerId?: string | null;
  actorId: string;
  requesterWebsiteId?: string | null;
  providerWebsiteId?: string | null;
  eventType: TaskFlowEventType;
  actorRole: TaskFlowActorRole;
  fromStatus?: TaskStatus | null;
  toStatus: TaskStatus;
  note?: string | null;
  metadata?: Prisma.InputJsonValue;
  eventKey: string;
};

@Injectable()
export class TaskFlowService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly providerRelatedEvents = new Set<TaskFlowEventType>([
    TaskFlowEventType.PROVIDER_APPLIED,
    TaskFlowEventType.PROVIDER_SELECTED,
    TaskFlowEventType.APPLICATION_REJECTED,
    TaskFlowEventType.PROVIDER_PROOF_UPLOADED,
    TaskFlowEventType.WORK_STARTED,
    TaskFlowEventType.WORK_SUBMITTED,
    TaskFlowEventType.WORK_RESUBMITTED,
    TaskFlowEventType.CANCELLATION_REQUESTED,
    TaskFlowEventType.CANCELLATION_ACCEPTED,
    TaskFlowEventType.CANCELLATION_REJECTED,
    TaskFlowEventType.REVISION_REQUESTED,
    TaskFlowEventType.TASK_APPROVED,
    TaskFlowEventType.TASK_COMPLETED,
    TaskFlowEventType.TASK_REJECTED,
    TaskFlowEventType.TASK_DISPUTED,
  ]);

  async recordTaskFlow(
    input: RecordTaskFlowInput,
    tx?: Prisma.TransactionClient,
  ) {
    this.validateInput(input);
    const db: DbClient = tx ?? this.prisma;

    const result = await db.taskFlow.upsert({
      where: {
        eventKey: input.eventKey,
      },
      update: {},
      create: {
        placementTaskId: input.placementTaskId,
        requesterId: input.requesterId,
        providerId: input.providerId ?? null,
        actorId: input.actorId,
        requesterWebsiteId: input.requesterWebsiteId ?? null,
        providerWebsiteId: input.providerWebsiteId ?? null,
        eventType: input.eventType,
        actorRole: input.actorRole,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus,
        actionTaken: input.eventType,
        note: input.note ?? null,
        metadata: input.metadata,
        eventKey: input.eventKey,
      },
    });

    return result;
  }

  private validateInput(input: RecordTaskFlowInput) {
    if (!input.placementTaskId) {
      throw new BadRequestException('placementTaskId is required');
    }

    if (!input.requesterId) {
      throw new BadRequestException('requesterId is required');
    }

    if (!input.actorId) {
      throw new BadRequestException('actorId is required');
    }

    if (!input.eventType) {
      throw new BadRequestException('eventType is required');
    }

    if (!input.actorRole) {
      throw new BadRequestException('actorRole is required');
    }

    if (!input.toStatus) {
      throw new BadRequestException('toStatus is required');
    }

    if (!input.eventKey) {
      throw new BadRequestException('eventKey is required');
    }

    if (
      this.providerRelatedEvents.has(input.eventType) &&
      (!input.providerId || !input.providerWebsiteId)
    ) {
      throw new BadRequestException(
        `providerId and providerWebsiteId are required for ${input.eventType}`,
      );
    }
  }
}
