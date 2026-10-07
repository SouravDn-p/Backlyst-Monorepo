import { RewardOutboxStatus } from '@prisma/client';
import { REWARD_AUDIT_ACTIONS } from '../enums';
import { RewardOutboxProcessorService } from './reward-outbox-processor.service';

describe('RewardOutboxProcessorService', () => {
  function createService() {
    const prisma = {
      rewardProcessingOutbox: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const rewardEngineService = {
      processApprovedTaskReward: jest.fn(),
    };

    const rewardAuditService = {
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
    };

    const service = new RewardOutboxProcessorService(
      prisma as any,
      rewardEngineService as any,
      rewardAuditService as any,
    );

    return { service, prisma, rewardEngineService, rewardAuditService };
  }

  it('processPending marks successful rows PROCESSED and failed rows FAILED without stopping', async () => {
    const { service, prisma, rewardEngineService, rewardAuditService } = createService();

    prisma.rewardProcessingOutbox.findMany.mockResolvedValue([
      { id: 'outbox-1' },
      { id: 'outbox-2' },
    ]);

    prisma.rewardProcessingOutbox.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'outbox-1') {
        return Promise.resolve({
          id: 'outbox-1',
          taskId: 'task-1',
          status: RewardOutboxStatus.PENDING,
          attempts: 0,
        });
      }

      return Promise.resolve({
        id: 'outbox-2',
        taskId: 'task-2',
        status: RewardOutboxStatus.PENDING,
        attempts: 0,
      });
    });

    prisma.rewardProcessingOutbox.updateMany.mockResolvedValue({ count: 1 });
    prisma.rewardProcessingOutbox.update.mockResolvedValue({});

    rewardEngineService.processApprovedTaskReward
      .mockResolvedValueOnce({ status: 'PROCESSED' })
      .mockRejectedValueOnce(new Error('processor failed'));

    const result = await service.processPending({ limit: 10 });

    expect(result).toEqual({ processed: 1, failed: 1, skipped: 0 });
    expect(prisma.rewardProcessingOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'outbox-1' },
        data: expect.objectContaining({ status: RewardOutboxStatus.PROCESSED }),
      }),
    );
    expect(prisma.rewardProcessingOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'outbox-2' },
        data: expect.objectContaining({ status: RewardOutboxStatus.FAILED }),
      }),
    );
    expect(rewardAuditService.recordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.REWARD_OUTBOX_PROCESSED,
      }),
    );
    expect(rewardAuditService.recordFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.REWARD_OUTBOX_FAILED,
      }),
    );
  });

  it('skips rows that cannot be claimed', async () => {
    const { service, prisma, rewardEngineService } = createService();
    prisma.rewardProcessingOutbox.findMany.mockResolvedValue([{ id: 'outbox-1' }]);
    prisma.rewardProcessingOutbox.findUnique.mockResolvedValue({
      id: 'outbox-1',
      taskId: 'task-1',
      status: RewardOutboxStatus.PENDING,
      attempts: 0,
    });
    prisma.rewardProcessingOutbox.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.processPending();

    expect(result).toEqual({ processed: 0, failed: 0, skipped: 1 });
    expect(rewardEngineService.processApprovedTaskReward).not.toHaveBeenCalled();
  });

  it('recovers stale PROCESSING rows and audits the recovery', async () => {
    const { service, prisma, rewardAuditService } = createService();
    prisma.rewardProcessingOutbox.findMany.mockResolvedValue([
      {
        id: 'stale-1',
        taskId: 'task-1',
        status: RewardOutboxStatus.PROCESSING,
        attempts: 2,
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ]);
    prisma.rewardProcessingOutbox.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.recoverStaleProcessing({
      olderThanMinutes: 30,
      limit: 50,
    });

    expect(result).toEqual({ recovered: 1, skipped: 0 });
    expect(prisma.rewardProcessingOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'stale-1',
          status: RewardOutboxStatus.PROCESSING,
        }),
        data: expect.objectContaining({
          status: RewardOutboxStatus.FAILED,
          lastError: 'Recovered stale PROCESSING reward outbox row',
        }),
      }),
    );
    expect(rewardAuditService.recordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.REWARD_OUTBOX_STALE_RECOVERED,
      }),
    );
  });
});
