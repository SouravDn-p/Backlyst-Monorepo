import { Test, TestingModule } from '@nestjs/testing';
import { AdminForensicAuditService } from './admin-forensic-audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AuditActionType,
  AuditRegistryImpact,
  AuditSeverity,
} from './dto/admin-forensic-audit-query.dto';

describe('AdminForensicAuditService', () => {
  let service: AdminForensicAuditService;

  const mockPrismaService = {
    adminCreditAdjustment: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'adj-1',
          action: 'REVERSE',
          createdAt: new Date('2024-06-20T14:22:01.000Z'),
          adminId: 'admin-1',
          websiteId: 'web-1',
          admin: { id: 'admin-1', name: 'SUPER ADMIN', role: 'ADMIN' },
          website: { id: 'web-1', name: 'TechTask', url: 'https://task1004.com' },
        },
      ]),
    },
    marketplaceOverride: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'ov-1',
          overrideType: 'BOOST',
          createdAt: new Date('2024-06-20T13:45:12.000Z'),
          adminId: 'admin-4',
          websiteId: 'web-2',
          admin: { id: 'admin-4', name: 'COMPLIANCE ADMIN', role: 'ADMIN' },
          website: { id: 'web-2', name: 'TechCrunch', url: 'https://techcrunch.com' },
        },
      ]),
    },
    taskFlow: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    rewardAuditLog: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminForensicAuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminForensicAuditService>(AdminForensicAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return normalized forensic audit log entries with correct pagination', async () => {
    const result = await service.getForensicAuditLogs({ page: 1, limit: 10 });

    expect(result).toBeDefined();
    expect(result.data!.items).toHaveLength(2);
    expect(result.data!.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });

    const firstItem = result.data!.items[0];
    expect(firstItem.actionType).toBe(AuditActionType.ESCROW_REVERSAL);
    expect(firstItem.registryImpact).toBe(AuditRegistryImpact.CREDIT);
    expect(firstItem.severity).toBe(AuditSeverity.CRITICAL);

    const secondItem = result.data!.items[1];
    expect(secondItem.actionType).toBe(AuditActionType.VISIBILITY_OVERRIDE);
    expect(secondItem.registryImpact).toBe(AuditRegistryImpact.VISIBILITY);
    expect(secondItem.severity).toBe(AuditSeverity.WARNING);
  });

  it('should filter items by actionType if provided', async () => {
    const result = await service.getForensicAuditLogs({
      page: 1,
      limit: 10,
      actionType: AuditActionType.VISIBILITY_OVERRIDE,
    });

    expect(result.data!.items).toHaveLength(1);
    expect(result.data!.items[0].actionType).toBe(AuditActionType.VISIBILITY_OVERRIDE);
  });
});
