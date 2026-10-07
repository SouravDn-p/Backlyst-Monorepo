import { DistributionEngine } from './distribution-engine.service';

// Build a DistributionEngine with a mocked Prisma client. Tests override
// `domainPairStat.count` to simulate pair-stat counts.
function makeEngine(overrides: any = {}): DistributionEngine {
  const prisma = {
    domainPairStat: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
  return new DistributionEngine(prisma);
}

describe('DistributionEngine — T5 network concentration', () => {
  it('returns true when the count is below the cap', async () => {
    const count = jest.fn().mockResolvedValue(3);
    const engine = makeEngine({ domainPairStat: { count } });

    const allowed = await engine.isNetworkConcentrationAllowed(
      'example.com',
      50,
      7,
    );

    expect(allowed).toBe(true);
    expect(count).toHaveBeenCalledWith({
      where: {
        OR: [{ domainA: 'example.com' }, { domainB: 'example.com' }],
        lastInteractionAt: { gte: expect.any(Date) },
      },
    });
  });

  it('returns false when the count is at or above the cap (fail-closed)', async () => {
    const engine = makeEngine({
      domainPairStat: { count: jest.fn().mockResolvedValue(50) },
    });

    expect(
      await engine.isNetworkConcentrationAllowed('example.com', 50, 7),
    ).toBe(false);

    const engineAtCap = makeEngine({
      domainPairStat: { count: jest.fn().mockResolvedValue(51) },
    });
    expect(
      await engineAtCap.isNetworkConcentrationAllowed('example.com', 50, 7),
    ).toBe(false);
  });

  it('returns true for empty/null domain (fail-open)', async () => {
    const count = jest.fn();
    const engine = makeEngine({ domainPairStat: { count } });

    expect(await engine.isNetworkConcentrationAllowed(null, 50, 7)).toBe(true);
    expect(await engine.isNetworkConcentrationAllowed('  ', 50, 7)).toBe(true);
    expect(count).not.toHaveBeenCalled();
  });

  it('returns true on a DB error (fail-open)', async () => {
    const engine = makeEngine({
      domainPairStat: {
        count: jest.fn().mockRejectedValue(new Error('db down')),
      },
    });

    expect(
      await engine.isNetworkConcentrationAllowed('example.com', 50, 7),
    ).toBe(true);
  });

  it('normalizes domains (lowercase + trim) before counting', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const engine = makeEngine({ domainPairStat: { count } });

    await engine.isNetworkConcentrationAllowed('  Example.COM ', 50, 7);

    expect(count).toHaveBeenCalledWith({
      where: {
        OR: [{ domainA: 'example.com' }, { domainB: 'example.com' }],
        lastInteractionAt: { gte: expect.any(Date) },
      },
    });
  });
});
