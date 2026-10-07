import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  async getDeadlineHistory(taskId: string, userId: string) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        requesterId: true,
        selectedProviderId: true,
        requestedDeadlineDays: true,
        deliveryDeadline: true,
        deadlineExtensionCount: true,
        deadlineExtendedDaysTotal: true,
        deadlineLastExtendedAt: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    const canAccess =
      task.requesterId === userId || task.selectedProviderId === userId;
    if (!canAccess) {
      throw new ForbiddenException(
        'Only requester or selected provider can access deadline history.',
      );
    }

    const extensions = await this.prisma.taskDeadlineExtension.findMany({
      where: { placementTaskId: taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return sendResponse('Deadline history fetched successfully.', {
      task,
      extensions,
    });
  }
}
