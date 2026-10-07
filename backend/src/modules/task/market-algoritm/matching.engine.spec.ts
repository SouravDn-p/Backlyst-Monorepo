import { BadRequestException } from '@nestjs/common';
import { MatchingEngine } from './matching.engine';

describe('MatchingEngine requester website filters', () => {
  let prisma: any;
  let engine: MatchingEngine;

  beforeEach(() => {
    prisma = {
      website: {
        findMany: jest.fn(),
      },
      placementTask: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    engine = new MatchingEngine(
      prisma,
      {
        normalizeRootDomain: jest.fn((value: string) => value),
      } as any,
      {} as any,
    );
  });

  it('keeps all eligible requester websites when no requester filters are selected', async () => {
    await (engine as any).getCandidateTasks(
      'provider-user-1',
      ['requester-website-1', 'requester-website-2'],
      {},
    );

    expect(prisma.website.findMany).not.toHaveBeenCalled();
    expect(prisma.placementTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterWebsiteId: {
            in: ['requester-website-1', 'requester-website-2'],
          },
          lifecycleStatus: { in: ['OPEN', 'WAITING_FOR_APPLICANTS'] },
          selectedProviderId: null,
          assignedProviderWebsiteId: null,
        }),
      }),
    );
  });

  it('supports one requester website filter at a time', async () => {
    prisma.website.findMany.mockResolvedValue([{ id: 'requester-website-1' }]);

    await (engine as any).getCandidateTasks(
      'provider-user-1',
      ['requester-website-1', 'requester-website-2'],
      { country: 'Bangladesh' },
    );

    expect(prisma.website.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['requester-website-1', 'requester-website-2'],
        },
        country: {
          contains: 'Bangladesh',
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    expect(prisma.placementTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterWebsiteId: {
            in: ['requester-website-1'],
          },
        }),
      }),
    );
  });

  it('filters available tasks by requester website country and industry', async () => {
    prisma.website.findMany.mockResolvedValue([
      { id: 'requester-website-1' },
      { id: 'requester-website-2' },
    ]);

    await (engine as any).getCandidateTasks(
      'provider-user-1',
      ['requester-website-1', 'requester-website-2', 'requester-website-3'],
      {
        country: 'Bangladesh',
        industry: 'Marketing',
        page: 1,
        limit: 10,
      },
    );

    expect(prisma.website.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [
            'requester-website-1',
            'requester-website-2',
            'requester-website-3',
          ],
        },
        country: {
          contains: 'Bangladesh',
          mode: 'insensitive',
        },
        industry: {
          contains: 'Marketing',
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    expect(prisma.placementTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterId: { not: 'provider-user-1' },
          requesterWebsiteId: {
            in: ['requester-website-1', 'requester-website-2'],
          },
          lifecycleStatus: { in: ['OPEN', 'WAITING_FOR_APPLICANTS'] },
          selectedProviderId: null,
          assignedProviderWebsiteId: null,
          placementApplications: { none: { providerId: 'provider-user-1' } },
        }),
      }),
    );
  });

  it('does not query tasks when requester website filters match nothing', async () => {
    prisma.website.findMany.mockResolvedValue([]);

    const result = await (engine as any).getCandidateTasks(
      'provider-user-1',
      ['requester-website-1'],
      {
        country: 'Canada',
        industry: 'Finance',
      },
    );

    expect(result).toEqual([]);
    expect(prisma.placementTask.findMany).not.toHaveBeenCalled();
  });

  it('rejects non-available opportunity statuses', async () => {
    await expect(
      (engine as any).getCandidateTasks(
        'provider-user-1',
        ['requester-website-1'],
        { status: 'SELECTED' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses only the selected provider website when providerWebsiteId is provided', () => {
    const result = (engine as any).filterProviderWebsitesByQuery(
      [
        { id: 'provider-website-1' },
        { id: 'provider-website-2' },
      ],
      'provider-website-2',
    );

    expect(result).toEqual([{ id: 'provider-website-2' }]);
  });
});
