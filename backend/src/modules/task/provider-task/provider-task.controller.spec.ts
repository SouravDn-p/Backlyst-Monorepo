import { Test, TestingModule } from '@nestjs/testing';
import { ProviderTaskController } from './provider-task.controller';
import { ProviderTaskService } from './provider-task.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

describe('ProviderTaskController', () => {
  let controller: ProviderTaskController;
  let service: ProviderTaskService;

  beforeEach(async () => {
    const mockService = {
      getProviderOpportunities: jest.fn().mockResolvedValue({ items: [], meta: {} }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderTaskController],
      providers: [
        {
          provide: ProviderTaskService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ProviderTaskController>(ProviderTaskController);
    service = module.get<ProviderTaskService>(ProviderTaskService);
  });

  it('should apply JwtAuthGuard to the controller', () => {
    const guards = Reflect.getMetadata('__guards__', ProviderTaskController);
    expect(guards).toBeDefined();
    const hasJwtGuard = guards.some((guard: any) => guard === JwtAuthGuard || guard.name === 'JwtAuthGuard');
    expect(hasJwtGuard).toBe(true);
  });

  it('delegates getProviderOpportunities to the service', async () => {
    const query = {
      providerWebsiteId: 'provider-website-1',
      placementType: 'GUEST_POST' as any,
      linkAttribute: 'DOFOLLOW' as any,
      country: 'Bangladesh',
      industry: 'Marketing',
      status: 'OPEN' as any,
      page: 1,
      limit: 10,
    };
    await controller.getProviderOpportunities('provider-1', query);
    expect(service.getProviderOpportunities).toHaveBeenCalledWith('provider-1', query);
  });
});
