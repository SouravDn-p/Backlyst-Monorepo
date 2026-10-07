import { NotFoundException } from '@nestjs/common';
import { AdminNicheCapService } from './admin-niche-cap.service';

function buildPrismaMock(overrides: Record<string, any> = {}) {
  const nicheDistributionCap = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const marketplaceCategory = {
    findUnique: jest.fn(),
  };
  return {
    nicheDistributionCap,
    marketplaceCategory,
    ...overrides,
  };
}

describe('AdminNicheCapService', () => {
  let service: AdminNicheCapService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AdminNicheCapService(prisma as any);
  });

  it('lists caps applying scope and isActive filters', async () => {
    prisma.nicheDistributionCap.findMany.mockResolvedValue([{ id: 'c1' }]);
    const result = await service.list({
      scope: 'PRIMARY',
      isActive: true,
    } as any);
    expect(prisma.nicheDistributionCap.findMany).toHaveBeenCalledWith({
      where: { scope: 'PRIMARY', isActive: true },
      orderBy: [{ scope: 'asc' }, { categoryKey: 'asc' }],
    });
    expect(result.data![0].id).toBe('c1');
  });

  it('creates a cap when the categoryKey exists', async () => {
    prisma.marketplaceCategory.findUnique.mockResolvedValue({ id: 'cat1' });
    prisma.nicheDistributionCap.create.mockResolvedValue({
      id: 'c1',
      categoryKey: 'cat1',
      scope: 'PRIMARY',
    });
    const result = await service.create({
      categoryKey: 'cat1',
      maxPerWindow: 10,
    });
    expect(prisma.nicheDistributionCap.create).toHaveBeenCalledWith({
      data: {
        categoryKey: 'cat1',
        scope: 'PRIMARY',
        maxPerWindow: 10,
        windowDays: 7,
        note: null,
      },
    });
    expect(result.data!.id).toBe('c1');
  });

  it('throws when categoryKey does not reference a real MarketplaceCategory', async () => {
    prisma.marketplaceCategory.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ categoryKey: 'missing', maxPerWindow: 10 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.nicheDistributionCap.create).not.toHaveBeenCalled();
  });

  it('updates only provided fields', async () => {
    prisma.nicheDistributionCap.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.nicheDistributionCap.update.mockResolvedValue({
      id: 'c1',
      maxPerWindow: 25,
    });
    await service.update('c1', { maxPerWindow: 25 });
    expect(prisma.nicheDistributionCap.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { maxPerWindow: 25 },
    });
  });

  it('soft-deletes by setting isActive false', async () => {
    prisma.nicheDistributionCap.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.nicheDistributionCap.update.mockResolvedValue({
      id: 'c1',
      isActive: false,
    });
    await service.remove('c1');
    expect(prisma.nicheDistributionCap.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { isActive: false },
    });
  });

  it('throws NotFoundException on update of missing cap', async () => {
    prisma.nicheDistributionCap.findUnique.mockResolvedValue(null);
    await expect(
      service.update('missing', { maxPerWindow: 5 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
