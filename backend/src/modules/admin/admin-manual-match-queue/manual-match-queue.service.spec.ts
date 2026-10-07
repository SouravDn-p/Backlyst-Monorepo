import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ManualMatchQueueService } from './manual-match-queue.service';
import {
  ManualMatchQueueStatusDtoEnum,
  ResolveManualMatchDto,
} from './dto/manual-match-queue.dto';

function makeService(overrides: any = {}): {
  service: ManualMatchQueueService;
  prisma: any;
} {
  const prisma = {
    placementTask: { findUnique: jest.fn() },
    website: { findMany: jest.fn() },
    manualMatchQueue: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ...overrides,
  };
  return { service: new ManualMatchQueueService(prisma), prisma };
}

describe('ManualMatchQueueService', () => {
  describe('enqueue', () => {
    it('creates a PENDING row for a valid triplet', async () => {
      const { service, prisma } = makeService();
      prisma.placementTask.findUnique.mockResolvedValue({
        id: 'task-1',
        requesterWebsiteId: 'req-1',
      });
      prisma.website.findMany.mockResolvedValue([
        { id: 'prov-1' },
        { id: 'req-1' },
      ]);
      prisma.manualMatchQueue.findFirst.mockResolvedValue(null);
      prisma.manualMatchQueue.create.mockResolvedValue({ id: 'row-1' });

      await service.enqueue('admin-1', {
        taskId: 'task-1',
        providerWebsiteId: 'prov-1',
        requesterWebsiteId: 'req-1',
        note: 'starved',
      });

      expect(prisma.manualMatchQueue.create).toHaveBeenCalledWith({
        data: {
          taskId: 'task-1',
          providerWebsiteId: 'prov-1',
          requesterWebsiteId: 'req-1',
          status: ManualMatchQueueStatusDtoEnum.PENDING,
          createdById: 'admin-1',
          note: 'starved',
        },
      });
    });

    it('throws NotFoundException when the task does not exist', async () => {
      const { service, prisma } = makeService();
      prisma.placementTask.findUnique.mockResolvedValue(null);

      await expect(
        service.enqueue('admin-1', {
          taskId: 'missing',
          providerWebsiteId: 'prov-1',
          requesterWebsiteId: 'req-1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when a website is missing/deleted', async () => {
      const { service, prisma } = makeService();
      prisma.placementTask.findUnique.mockResolvedValue({
        id: 'task-1',
        requesterWebsiteId: 'req-1',
      });
      prisma.website.findMany.mockResolvedValue([{ id: 'prov-1' }]);

      await expect(
        service.enqueue('admin-1', {
          taskId: 'task-1',
          providerWebsiteId: 'prov-1',
          requesterWebsiteId: 'req-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for a duplicate open triplet', async () => {
      const { service, prisma } = makeService();
      prisma.placementTask.findUnique.mockResolvedValue({
        id: 'task-1',
        requesterWebsiteId: 'req-1',
      });
      prisma.website.findMany.mockResolvedValue([
        { id: 'prov-1' },
        { id: 'req-1' },
      ]);
      prisma.manualMatchQueue.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.enqueue('admin-1', {
          taskId: 'task-1',
          providerWebsiteId: 'prov-1',
          requesterWebsiteId: 'req-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('resolve', () => {
    const baseRow = {
      id: 'row-1',
      status: ManualMatchQueueStatusDtoEnum.PENDING,
      note: null,
    };

    it('applies the decision and sets resolvedAt', async () => {
      const { service, prisma } = makeService();
      prisma.manualMatchQueue.findUnique.mockResolvedValue(baseRow);
      prisma.manualMatchQueue.update.mockResolvedValue({ id: 'row-1' });
      const dto: ResolveManualMatchDto = {
        decision: ManualMatchQueueStatusDtoEnum.APPLIED,
      };

      await service.resolve('row-1', 'admin-1', dto);

      expect(prisma.manualMatchQueue.update).toHaveBeenCalledWith({
        where: { id: 'row-1' },
        data: {
          status: ManualMatchQueueStatusDtoEnum.APPLIED,
          resolvedAt: expect.any(Date),
          note: null,
        },
      });
    });

    it('appends the admin note on resolve', async () => {
      const { service, prisma } = makeService();
      prisma.manualMatchQueue.findUnique.mockResolvedValue({
        ...baseRow,
        note: 'prior',
      });
      prisma.manualMatchQueue.update.mockResolvedValue({ id: 'row-1' });
      const dto: ResolveManualMatchDto = {
        decision: ManualMatchQueueStatusDtoEnum.RESOLVED,
        note: 'looks good',
      };

      await service.resolve('row-1', 'admin-9', dto);

      const data = prisma.manualMatchQueue.update.mock.calls[0][0].data;
      expect(data.status).toBe(ManualMatchQueueStatusDtoEnum.RESOLVED);
      expect(data.note).toContain('prior');
      expect(data.note).toContain('[admin-9] looks good');
    });

    it('rejects resolving an already-terminal row', async () => {
      const { service, prisma } = makeService();
      prisma.manualMatchQueue.findUnique.mockResolvedValue({
        ...baseRow,
        status: ManualMatchQueueStatusDtoEnum.APPLIED,
      });
      const dto: ResolveManualMatchDto = {
        decision: ManualMatchQueueStatusDtoEnum.CANCELLED,
      };

      await expect(
        service.resolve('row-1', 'admin-1', dto),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.manualMatchQueue.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown row', async () => {
      const { service, prisma } = makeService();
      prisma.manualMatchQueue.findUnique.mockResolvedValue(null);
      const dto: ResolveManualMatchDto = {
        decision: ManualMatchQueueStatusDtoEnum.RESOLVED,
      };

      await expect(
        service.resolve('nope', 'admin-1', dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
