import { Test, TestingModule } from '@nestjs/testing';
import { AdminMarketplaceOverrideController } from './admin-marketplace-override.controller';
import { MarketplaceOverrideService } from 'src/modules/task/market-algoritm/marketplace-override.service';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';

describe('AdminMarketplaceOverrideController', () => {
  let controller: AdminMarketplaceOverrideController;
  let service: MarketplaceOverrideService;

  beforeEach(async () => {
    const mockService = {
      createOverride: jest.fn().mockResolvedValue({ id: 'test-id' }),
      listOverrides: jest.fn().mockResolvedValue([]),
      updateOverride: jest.fn().mockResolvedValue({ id: 'test-id', updated: true }),
      revokeOverride: jest.fn().mockResolvedValue({ id: 'test-id', status: 'REVOKED' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMarketplaceOverrideController],
      providers: [
        {
          provide: MarketplaceOverrideService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AdminMarketplaceOverrideController>(AdminMarketplaceOverrideController);
    service = module.get<MarketplaceOverrideService>(MarketplaceOverrideService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should apply AdminGuard to the controller', () => {
    const guards = Reflect.getMetadata('__guards__', AdminMarketplaceOverrideController);
    expect(guards).toBeDefined();
    // In NestJS, guards metadata stores the guard class or instance
    const hasAdminGuard = guards.some((guard: any) => guard === AdminGuard || guard.name === 'AdminGuard');
    expect(hasAdminGuard).toBe(true);
  });

  it('Admin can create a valid override', async () => {
    const dto: any = { type: 'BOOST', reasonCode: 'TEST', boostValue: 1.5 };
    const result = await controller.create('admin1', dto);
    
    expect(service.createOverride).toHaveBeenCalledWith('admin1', dto);
    expect(result).toEqual({ id: 'test-id' });
  });

  it('Admin can list active overrides', async () => {
    const result = await controller.list('web1');
    expect(service.listOverrides).toHaveBeenCalledWith('web1');
    expect(result).toEqual([]);
  });

  it('Admin can update an override', async () => {
    const dto: any = { boostValue: 2.0 };
    const result = await controller.update('admin1', 'test-id', dto);
    
    expect(service.updateOverride).toHaveBeenCalledWith('admin1', 'test-id', dto);
    expect(result).toEqual({ id: 'test-id', updated: true });
  });

  it('Admin can revoke an override', async () => {
    const dto: any = { reason: 'No longer needed' };
    const result = await controller.revoke('admin1', 'test-id', dto);
    
    expect(service.revokeOverride).toHaveBeenCalledWith('admin1', 'test-id', 'No longer needed');
    expect(result).toEqual({ id: 'test-id', status: 'REVOKED' });
  });
});
