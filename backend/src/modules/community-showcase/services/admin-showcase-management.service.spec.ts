import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShowcaseEntityType, ShowcaseSection, UserRole, UserStatus } from '@prisma/client';
import { AdminShowcaseManagementService } from './admin-showcase-management.service';

describe('AdminShowcaseManagementService', () => {
  const prisma = {
    communityShowcaseEntry: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    website: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;
  const snapshotService = {
    generateAllSnapshots: jest.fn(),
    generateSnapshot: jest.fn(),
  } as any;
  const userStatsService = {
    refreshUserStats: jest.fn(),
    refreshAllUserStats: jest.fn(),
  } as any;
  const websiteStatsService = {
    refreshWebsiteStats: jest.fn(),
    refreshAllWebsiteStats: jest.fn(),
  } as any;

  let service: AdminShowcaseManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminShowcaseManagementService(
      prisma,
      snapshotService,
      userStatsService,
      websiteStatsService,
    );
  });

  it('blocks duplicate visible showcase entries for the same section/entity pair', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      name: 'User 1',
      country: 'BD',
      websites: [],
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });
    prisma.communityShowcaseEntry.findFirst.mockResolvedValue({ id: 'existing-entry' });

    await expect(
      service.createEntry(
        {
          section: ShowcaseSection.FEATURED_MEMBERS,
          entityType: ShowcaseEntityType.USER,
          entityId: 'user-1',
          isVisible: true,
        },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recalculates all ranking snapshots when no section is provided', async () => {
    snapshotService.generateAllSnapshots.mockResolvedValue({ generated: 3, failed: 0, results: [] });

    const result = await service.recalculateRankings({});

    expect(snapshotService.generateAllSnapshots).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ generated: 3, failed: 0 }),
      }),
    );
  });

  it('throws when trying to hide a non-existing entry', async () => {
    prisma.communityShowcaseEntry.findUnique.mockResolvedValue(null);

    await expect(service.hideEntry('missing-entry', 'admin-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
