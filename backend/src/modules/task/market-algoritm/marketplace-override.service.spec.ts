import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceOverrideService } from './marketplace-override.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('MarketplaceOverrideService', () => {
  let service: MarketplaceOverrideService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      marketplaceOverride: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceOverrideService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<MarketplaceOverrideService>(MarketplaceOverrideService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveForWebsite', () => {
    it('applies force-match behavior only when valid and active', async () => {
      // Mock an active FORCE_MATCH
      (prisma.marketplaceOverride.findMany as jest.Mock).mockResolvedValue([
        {
          type: 'FORCE_MATCH',
          forceMatchNext: true,
          status: 'ACTIVE',
        }
      ]);

      const result = await service.resolveForWebsite('website-1');
      expect(result.forceMatchNext).toBe(true);
    });

    it('does not apply expired or revoked overrides (not returned by db query)', async () => {
      // The service method queries with status: 'ACTIVE' and activeUntil >= now
      // So if the DB returns nothing, it should not apply anything
      (prisma.marketplaceOverride.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveForWebsite('website-1');
      expect(result.forceMatchNext).toBe(false);
      expect(result.suppressed).toBe(false);
      expect(result.boostValue).toBeNull();
    });

    it('handles SUPPRESS and PENALTY type by setting suppressed flag if suppressUntil is future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      (prisma.marketplaceOverride.findMany as jest.Mock).mockResolvedValue([
        {
          type: 'SUPPRESS',
          suppressUntil: futureDate,
          status: 'ACTIVE',
        }
      ]);

      const result = await service.resolveForWebsite('website-1');
      expect(result.suppressed).toBe(true);
    });

    it('does not set suppressed flag if suppressUntil is past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      (prisma.marketplaceOverride.findMany as jest.Mock).mockResolvedValue([
        {
          type: 'SUPPRESS',
          suppressUntil: pastDate,
          status: 'ACTIVE',
        }
      ]);

      const result = await service.resolveForWebsite('website-1');
      expect(result.suppressed).toBe(false);
    });
  });
});
