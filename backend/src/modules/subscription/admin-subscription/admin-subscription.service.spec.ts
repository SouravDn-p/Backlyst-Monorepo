import { Test, TestingModule } from '@nestjs/testing';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminSubscriptionService } from './admin-subscription.service';

describe('AdminSubscriptionService', () => {
  let service: AdminSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSubscriptionService,
        {
          provide: PrismaService,
          useValue: {
            subscription: {
              count: jest.fn(),
              findMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AwsS3Service,
          useValue: {
            getDownloadUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminSubscriptionService>(AdminSubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
