import { TaskRequesterService } from './task-requester.service';
import { TaskReviewActionDtoEnum } from './dto/review-task.dto';

/**
 * Focused unit test for M1: auto-refund of requester credit on a REJECTED
 * submission that is NOT escalated to DISPUTED.
 */
function makeService(overrides: Record<string, any> = {}) {
  const tx = {
    placementTask: {
      update: jest.fn().mockResolvedValue({
        id: 'task-1',
        assignedProviderWebsiteId: 'pw-1',
        lifecycleStatus: 'REVISION_REQUESTED',
        submissionStatus: 'REJECTED',
        providerRewardCredits: 2,
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    placementApplication: { updateMany: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    placementTask: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'task-1',
        requesterId: 'req-1',
        requesterWebsiteId: 'rw-1',
        submissionStatus: 'SUBMITTED',
        selectedProviderId: 'prov-1',
        assignedProviderWebsiteId: 'pw-1',
        lifecycleStatus: 'SUBMITTED',
        creditCost: 5,
        reservedCreditAmount: 5,
        walletType: 'SUBSCRIPTION',
      }),
    },
    $transaction: jest.fn().mockImplementation(async (cb: any) => await cb(tx)),
    website: {
      findUnique: jest.fn().mockResolvedValue({ rootDomain: 'x.com' }),
    },
    websiteMatchingProfile: { upsert: jest.fn().mockResolvedValue({}) },
    creditLog: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ creditType: 'SUBSCRIPTION', note: 'TASK_POST' }),
    },
    ...overrides.prisma,
  };

  const creditTaskService = {
    handleRejectedTaskCredit: jest.fn().mockResolvedValue({ success: true }),
  };
  const taskFlowService = {
    recordTaskFlow: jest.fn().mockResolvedValue({}),
  };
  const scoringService = {
    updateScoresAfterTask: jest.fn().mockResolvedValue({}),
    scheduleOrRunUpdateScores: jest.fn().mockResolvedValue({}),
  };
  const riskEngine = {
    processRiskEvent: jest
      .fn()
      .mockResolvedValue({ riskScore: 50, reason: 'REJECTION' }),
  };
  const validationEngine = {
    validateTransition: jest
      .fn()
      .mockResolvedValue({ decision: 'APPROVED', publicMessage: '' }),
  };
  const disputeService = { openDispute: jest.fn().mockResolvedValue({}) };
  const domainInteractionRecorder = { record: jest.fn().mockResolvedValue({}) };
  const weeklyContributionService = {
    processApprovedVerifiedPlacement: jest.fn().mockResolvedValue({}),
  };
  const taskNotificationService = {
    sendTaskNotification: jest.fn().mockResolvedValue({}),
  };
  const s3 = { resolveFileUrl: jest.fn().mockResolvedValue(null) };
  const opportunityAlertService = {
    alertMatchingProviders: jest.fn().mockResolvedValue(undefined),
  };
  const graduatedPenaltyService = {
    computePenalty: jest
      .fn()
      .mockResolvedValue({ boostMultiplier: 1, riskScoreIncrease: 0 }),
  };
  const trustIndicatorService = {
    getIndicators: jest.fn().mockResolvedValue([]),
  };

  const service = new TaskRequesterService(
    prisma,
    creditTaskService as any,
    taskFlowService as any,
    weeklyContributionService as any,
    taskNotificationService as any,
    disputeService as any,
    s3 as any,
    validationEngine as any,
    scoringService as any,
    riskEngine as any,
    domainInteractionRecorder as any,
    opportunityAlertService as any,
    graduatedPenaltyService as any,
    trustIndicatorService as any,
    {} as any, // rewardOutboxService
  );

  return {
    service,
    prisma,
    creditTaskService,
    scoringService,
    disputeService,
    tx,
  };
}

describe('TaskRequesterService.reviewTask — M1 auto-refund on reject', () => {
  it('refunds the requester credit when a submission is REJECTED (not disputed)', async () => {
    const { service, creditTaskService } = makeService();

    await service.reviewTask('task-1', 'req-1', {
      action: TaskReviewActionDtoEnum.REJECT,
      note: 'not good',
    });

    expect(creditTaskService.handleRejectedTaskCredit).toHaveBeenCalledTimes(1);
    const [actor, websiteId, taskId] =
      creditTaskService.handleRejectedTaskCredit.mock.calls[0];
    expect(actor).toBe('req-1');
    expect(websiteId).toBe('pw-1');
    expect(taskId).toBe('task-1');
  });

  it('does NOT refund when the rejected submission escalates to DISPUTED', async () => {
    const { service, creditTaskService } = makeService({
      prisma: {
        placementTask: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'task-1',
            requesterId: 'req-1',
            requesterWebsiteId: 'rw-1',
            submissionStatus: 'SUBMITTED',
            selectedProviderId: 'prov-1',
            assignedProviderWebsiteId: 'pw-1',
            lifecycleStatus: 'SUBMITTED',
            creditCost: 5,
            reservedCreditAmount: 5,
          }),
        },
        $transaction: jest.fn().mockImplementation(async (cb: any) =>
          await cb({
            placementTask: {
              update: jest.fn().mockResolvedValue({
                id: 'task-1',
                assignedProviderWebsiteId: 'pw-1',
                lifecycleStatus: 'DISPUTED',
                submissionStatus: 'REJECTED',
                providerRewardCredits: 2,
              }),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            placementApplication: {
              updateMany: jest.fn().mockResolvedValue({}),
            },
          }),
        ),
        website: {
          findUnique: jest.fn().mockResolvedValue({ rootDomain: 'x.com' }),
        },
        websiteMatchingProfile: { upsert: jest.fn().mockResolvedValue({}) },
        creditLog: {
          findFirst: jest
            .fn()
            .mockResolvedValue({
              creditType: 'SUBSCRIPTION',
              note: 'TASK_POST',
            }),
        },
      },
    });

    await service.reviewTask('task-1', 'req-1', {
      action: TaskReviewActionDtoEnum.REJECT,
      note: 'dispute this',
    });

    expect(creditTaskService.handleRejectedTaskCredit).not.toHaveBeenCalled();
  });
});
