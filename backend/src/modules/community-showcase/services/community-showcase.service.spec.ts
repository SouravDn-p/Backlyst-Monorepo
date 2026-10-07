import { RankingPeriod, ShowcaseEntityType, ShowcaseSection } from '@prisma/client';
import { CommunityShowcaseService } from './community-showcase.service';

describe('CommunityShowcaseService', () => {
  const prisma = {
    communityShowcaseEntry: { findMany: jest.fn() },
  } as any;
  const s3 = { resolveFileUrl: jest.fn() } as any;
  const snapshotService = { getLatestSnapshot: jest.fn() } as any;

  let service: CommunityShowcaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunityShowcaseService(prisma, s3, snapshotService);
  });

  it('returns an empty stable payload when no snapshot exists for an auto section', async () => {
    snapshotService.getLatestSnapshot.mockResolvedValue(null);

    const result = await service.getShowcase({
      section: ShowcaseSection.TOP_CONTRIBUTORS,
      period: RankingPeriod.ALL_TIME,
      entityType: ShowcaseEntityType.USER,
      limit: 20,
      page: 1,
    });

    expect(snapshotService.getLatestSnapshot).toHaveBeenCalledWith(
      ShowcaseSection.TOP_CONTRIBUTORS,
      RankingPeriod.ALL_TIME,
      ShowcaseEntityType.USER,
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          items: [],
          generatedAt: null,
          source: 'SNAPSHOT',
          hasMore: false,
          nextCursor: null,
        }),
      }),
    );
  });
});
