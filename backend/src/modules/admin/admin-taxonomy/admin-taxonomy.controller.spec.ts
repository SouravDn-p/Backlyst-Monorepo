import { Test, TestingModule } from '@nestjs/testing';
import { AdminTaxonomyController } from './admin-taxonomy.controller';

import { AdminTaxonomyService } from './admin-taxonomy.service';

describe('AdminTaxonomyController', () => {
  let controller: AdminTaxonomyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTaxonomyController],
      providers: [
        {
          provide: AdminTaxonomyService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AdminTaxonomyController>(AdminTaxonomyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
