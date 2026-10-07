import { RewardOutboxStatus } from '@prisma/client';
import { REWARD_AUDIT_ACTIONS } from '../enums';
import { RewardOutboxService } from './reward-outbox.service';

describe('RewardOutboxService', () => {
  function createService() {
    const prisma = {
      rewardProcessingOutbox: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const rewardAuditService = {
      recordSuccess: jest.fn(),
    };

    const service = new RewardOutboxService(
      prisma as any,
      rewardAuditService as any,
    );
    return { service, prisma, rewardAuditService };
  }

  it('enqueueApprovedTask creates one outbox row and can be called twice safely', async () => {
    const { service, prisma, rewardAuditService } = createService();
    prisma.rewardProcessingOutbox.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'outbox-1' });
    prisma.rewardProcessingOutbox.create.mockResolvedValue({ id: 'outbox-1' });

    const first = await service.enqueueApprovedTask({ taskId: 'task-1' });
    const second = await service.enqueueApprovedTask({ taskId: 'task-1' });

    expect(first).toEqual({ created: true, rowId: 'outbox-1' });
    expect(second).toEqual({ created: false, rowId: 'outbox-1' });
    expect(prisma.rewardProcessingOutbox.create).toHaveBeenCalledTimes(1);
    expect(rewardAuditService.recordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.REWARD_OUTBOX_CREATED,
      }),
    );
  });

  it('returns outbox health summary including stale processing count', async () => {
    const { service, prisma } = createService();
    prisma.rewardProcessingOutbox.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);
    prisma.rewardProcessingOutbox.findFirst
      .mockResolvedValueOnce({ createdAt: new Date('2026-07-01T00:00:00.000Z') })
      .mockResolvedValueOnce({ createdAt: new Date('2026-07-01T01:00:00.000Z') })
      .mockResolvedValueOnce({ processedAt: new Date('2026-07-03T00:00:00.000Z') });
    prisma.rewardProcessingOutbox.findMany.mockResolvedValue([
      { id: 'failed-1', taskId: 'task-1', attempts: 2, lastError: 'boom' },
    ]);

    const result = await service.getOutboxHealth();

    expect(result.data!.counts).toEqual({
      PENDING: 2,
      PROCESSING: 1,
      PROCESSED: 5,
      FAILED: 3,
    });
    expect(result.data!.staleProcessingCount).toBe(4);
    expect(result.data!.failedRecent).toHaveLength(1);
  });

  it('returns paginated outbox rows', async () => {
    const { service, prisma } = createService();
    prisma.rewardProcessingOutbox.findMany.mockResolvedValue([{ id: 'row-1' }]);
    prisma.rewardProcessingOutbox.count.mockResolvedValue(1);

    const result = await service.getOutboxRows({
      status: RewardOutboxStatus.FAILED,
      page: 1,
      limit: 20,
    });

    expect(prisma.rewardProcessingOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: RewardOutboxStatus.FAILED },
        take: 20,
      }),
    );
    expect(result.data!.meta.total).toBe(1);
  });
});
