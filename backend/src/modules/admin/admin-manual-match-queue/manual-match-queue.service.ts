import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EnqueueManualMatchDto,
  ListManualMatchQueueDto,
  ManualMatchQueueStatusDtoEnum,
  ResolveManualMatchDto,
} from './dto/manual-match-queue.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

// Terminal statuses that can no longer be changed by a resolve call.
const TERMINAL_STATUSES: string[] = [
  ManualMatchQueueStatusDtoEnum.APPLIED,
  ManualMatchQueueStatusDtoEnum.RESOLVED,
  ManualMatchQueueStatusDtoEnum.CANCELLED,
];

// Open statuses eligible for re-resolution (only PENDING).
const OPEN_STATUS = ManualMatchQueueStatusDtoEnum.PENDING;

@Injectable()
export class ManualMatchQueueService {
  private readonly logger = new Logger(ManualMatchQueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Queue a manual match for admin review. Validates that the task and both
   * websites exist, and refuses to create a duplicate open (PENDING) row for
   * the same task/provider/requester triplet.
   */
  async enqueue(adminId: string, dto: EnqueueManualMatchDto) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: dto.taskId },
      select: { id: true, requesterWebsiteId: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    const websites = await this.prisma.website.findMany({
      where: {
        id: { in: [dto.providerWebsiteId, dto.requesterWebsiteId] },
        isDeleted: false,
      },
      select: { id: true },
    });
    if (websites.length !== 2) {
      throw new BadRequestException(
        'Both providerWebsiteId and requesterWebsiteId must reference existing, non-deleted websites.',
      );
    }

    const existing = await this.prisma.manualMatchQueue.findFirst({
      where: {
        taskId: dto.taskId,
        providerWebsiteId: dto.providerWebsiteId,
        requesterWebsiteId: dto.requesterWebsiteId,
        status: OPEN_STATUS,
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'An open manual match queue entry already exists for this task/provider/requester triplet.',
      );
    }

    const row = await this.prisma.manualMatchQueue.create({
      data: {
        taskId: dto.taskId,
        providerWebsiteId: dto.providerWebsiteId,
        requesterWebsiteId: dto.requesterWebsiteId,
        status: OPEN_STATUS,
        createdById: adminId,
        note: dto.note ?? null,
      },
    });

    return sendResponse('Manual match queued successfully', row);
  }

  /**
   * Apply an admin decision to a queue row. Terminal rows cannot be changed.
   */
  async resolve(queueId: string, adminId: string, dto: ResolveManualMatchDto) {
    const row = await this.prisma.manualMatchQueue.findUnique({
      where: { id: queueId },
      select: { id: true, status: true, note: true },
    });
    if (!row) {
      throw new NotFoundException('Manual match queue entry not found.');
    }
    if (TERMINAL_STATUSES.includes(row.status)) {
      throw new BadRequestException(
        `Queue entry is already in a terminal status (${row.status}) and cannot be changed.`,
      );
    }

    const updated = await this.prisma.manualMatchQueue.update({
      where: { id: queueId },
      data: {
        status: dto.decision,
        resolvedAt: new Date(),
        note:
          dto.note !== undefined
            ? `${row.note ? `${row.note}\n` : ''}[${adminId}] ${dto.note}`
            : row.note,
      },
    });

    return sendResponse('Manual match queue entry resolved', updated);
  }

  /**
   * Paginated, filterable list of queue entries ordered newest-first.
   */
  async list(query: ListManualMatchQueueDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.manualMatchQueue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.manualMatchQueue.count({ where }),
    ]);

    return sendResponse('Manual match queue fetched successfully', {
      items: rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 0,
    });
  }
}
