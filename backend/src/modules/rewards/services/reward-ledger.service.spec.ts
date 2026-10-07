import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RewardLedgerType } from '@prisma/client';
import { RewardLedgerService } from './reward-ledger.service';

describe('RewardLedgerService', () => {
  function createService() {
    const prisma = {
      rewardLedger: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const service = new RewardLedgerService(prisma as any);
    return { service, prisma };
  }

  it('writeOnce creates a ledger row', async () => {
    const { service, prisma } = createService();
    prisma.rewardLedger.findUnique.mockResolvedValue(null);
    prisma.rewardLedger.create.mockResolvedValue({ id: 'ledger-1', eventKey: 'event-1' });

    const result = await service.writeOnce({
      userId: 'user-1',
      rewardType: RewardLedgerType.BADGE_EARNED,
      rewardCode: 'FIRST_SUCCESS',
      eventKey: 'event-1',
    });

    expect(result).toEqual({
      created: true,
      entry: { id: 'ledger-1', eventKey: 'event-1' },
    });
  });

  it('writeOnce called twice with same eventKey does not throw', async () => {
    const { service, prisma } = createService();
    prisma.rewardLedger.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'ledger-1', eventKey: 'event-1' });
    prisma.rewardLedger.create.mockResolvedValue({ id: 'ledger-1', eventKey: 'event-1' });

    const first = await service.writeOnce({
      userId: 'user-1',
      rewardType: RewardLedgerType.BADGE_EARNED,
      rewardCode: 'FIRST_SUCCESS',
      eventKey: 'event-1',
    });
    const second = await service.writeOnce({
      userId: 'user-1',
      rewardType: RewardLedgerType.BADGE_EARNED,
      rewardCode: 'FIRST_SUCCESS',
      eventKey: 'event-1',
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(prisma.rewardLedger.create).toHaveBeenCalledTimes(1);
  });

  it('handles duplicate key P2002 safely', async () => {
    const { service, prisma } = createService();
    prisma.rewardLedger.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'ledger-dup', eventKey: 'event-dup' });
    prisma.rewardLedger.create.mockRejectedValue(
      new PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );

    const result = await service.writeOnce({
      userId: 'user-1',
      rewardType: RewardLedgerType.BADGE_EARNED,
      rewardCode: 'FIRST_SUCCESS',
      eventKey: 'event-dup',
    });

    expect(result).toEqual({
      created: false,
      entry: { id: 'ledger-dup', eventKey: 'event-dup' },
    });
  });
});
