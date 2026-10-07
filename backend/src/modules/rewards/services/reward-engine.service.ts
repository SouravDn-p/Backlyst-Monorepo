import { Injectable, NotFoundException } from '@nestjs/common';
import {
  SubmissionStatus,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadgeEngineService } from './badge-engine.service';
import { UserRewardProfileService } from './user-reward-profile.service';

type ProcessApprovedTaskRewardInput = {
  taskId: string;
  actorId?: string;
  source?: string;
};

@Injectable()
export class RewardEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRewardProfileService: UserRewardProfileService,
    private readonly badgeEngineService: BadgeEngineService,
  ) {}

  async processApprovedTaskReward(input: ProcessApprovedTaskRewardInput) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: input.taskId },
      select: {
        id: true,
        requesterId: true,
        selectedProviderId: true,
        lifecycleStatus: true,
        submissionStatus: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Approved reward task not found.');
    }

    if (
      task.lifecycleStatus !== TaskStatus.COMPLETED ||
      task.submissionStatus !== SubmissionStatus.APPROVED
    ) {
      return {
        taskId: input.taskId,
        status: 'SKIPPED' as const,
        reason: 'TASK_NOT_APPROVED_COMPLETED',
      };
    }

    if (!task.requesterId) {
      return {
        taskId: input.taskId,
        status: 'SKIPPED' as const,
        reason: 'REQUESTER_MISSING',
      };
    }

    const refreshed = await this.prisma.$transaction((tx) =>
      this.userRewardProfileService.refreshForApprovedTask(
        { taskId: input.taskId, tx },
      ),
    );

    if (refreshed.requesterUserId) {
      await this.badgeEngineService.evaluateUserBadges({
        userId: refreshed.requesterUserId,
        roleContext: 'REQUESTER',
        taskId: input.taskId,
        actorId: input.actorId,
      });
    }

    if (refreshed.providerUserId) {
      await this.badgeEngineService.evaluateUserBadges({
        userId: refreshed.providerUserId,
        roleContext: 'PROVIDER',
        taskId: input.taskId,
        actorId: input.actorId,
      });
    }

    return {
      taskId: input.taskId,
      status: 'PROCESSED' as const,
      reason: input.source,
    };
  }
}
