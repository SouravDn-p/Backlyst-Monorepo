import { DirectTaskRequestService } from './direct-task-request.service';
import { DirectTaskRequestStatus, PlacementType } from '@prisma/client';
import { CreditWalletTypeDtoEnum } from 'src/modules/credit/credit-task/dto/task-credit.dto';
import { PlacementTypeDtoEnum } from '../task-requester/dto/create-task.dto';

describe('DirectTaskRequestService', () => {
  let service: DirectTaskRequestService;
  let prisma: any;
  let creditTaskService: any;
  let validationEngine: any;
  let taskFlowService: any;
  let notificationService: any;
  let s3: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'provider-1', isDeleted: false }),
      },
      website: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p-site-1', authorId: 'provider-1' }),
      },
      directTaskRequest: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'req-1', ...data }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
      },
      placementTask: {
        create: jest.fn().mockResolvedValue({ id: 'task-1', placementType: PlacementType.GUEST_POST }),
        update: jest.fn().mockResolvedValue({ id: 'task-1' }),
      },
      placementApplication: {
        create: jest.fn().mockResolvedValue({ id: 'app-1' }),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => await cb(prisma)),
    };

    creditTaskService = {
      deductTaskCredit: jest.fn().mockResolvedValue({ success: true }),
      refundTaskCredit: jest.fn().mockResolvedValue({ success: true }),
    };

    validationEngine = {
      isUserActive: jest.fn().mockResolvedValue(true),
      isWebsiteEligible: jest.fn().mockResolvedValue(true),
    };

    taskFlowService = {
      recordTaskFlow: jest.fn().mockResolvedValue({}),
    };

    notificationService = {
      sendNotification: jest.fn().mockResolvedValue({}),
    };

    s3 = {
      uploadFileToS3: jest.fn(),
    };

    service = new DirectTaskRequestService(
      prisma,
      creditTaskService,
      validationEngine,
      taskFlowService,
      notificationService,
      s3,
    );
  });

  describe('createDirectRequest', () => {
    it('should deduct credits and create PENDING direct task request', async () => {
      const payload = {
        requesterWebsiteId: 'r-site-1',
        targetProviderId: 'provider-1',
        projectTitle: 'Direct Guest Post',
        targetUrl: 'https://example.com/target',
        anchorText: 'seo tools',
        placementType: PlacementTypeDtoEnum.GUEST_POST,
        linkAttribute: 'DOFOLLOW' as any,
        requestedDeadlineDays: 7,
        walletType: CreditWalletTypeDtoEnum.SUBSCRIPTION,
      };

      const result = await service.createDirectRequest('req-1', payload);

      expect(creditTaskService.deductTaskCredit).toHaveBeenCalledWith(
        'req-1',
        expect.objectContaining({
          creditAmount: 2,
          walletType: CreditWalletTypeDtoEnum.SUBSCRIPTION,
        }),
      );
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'provider-1',
        }),
      );
      expect(result.data!.status).toBe(DirectTaskRequestStatus.PENDING);
    });

    it('should throw error if requestedDeadlineDays is invalid', async () => {
      const payload = {
        requesterWebsiteId: 'r-site-1',
        targetProviderId: 'provider-1',
        projectTitle: 'Direct Guest Post',
        targetUrl: 'https://example.com/target',
        anchorText: 'seo tools',
        placementType: PlacementTypeDtoEnum.GUEST_POST,
        linkAttribute: 'DOFOLLOW' as any,
        requestedDeadlineDays: 4, // Invalid day
        walletType: CreditWalletTypeDtoEnum.SUBSCRIPTION,
      };

      await expect(
        service.createDirectRequest('req-1', payload),
      ).rejects.toThrow('requestedDeadlineDays must be one of: 3, 5, 7, 10, 14, 21, 30');
    });
  });

  describe('acceptDirectRequest', () => {
    it('should create PlacementTask, assign provider, and accept request', async () => {
      prisma.directTaskRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        requesterId: 'req-1',
        requesterWebsiteId: 'r-site-1',
        targetProviderId: 'provider-1',
        projectTitle: 'Direct Guest Post',
        targetUrl: 'https://example.com/target',
        anchorText: 'seo tools',
        placementType: PlacementType.GUEST_POST,
        linkAttribute: 'DOFOLLOW',
        requestedDeadlineDays: 7,
        creditCost: 2,
        reservedCreditAmount: 2,
        walletType: 'SUBSCRIPTION',
        status: DirectTaskRequestStatus.PENDING,
        supportDocuments: [],
      });

      const result = await service.acceptDirectRequest('provider-1', 'req-1', {
        providerWebsiteId: 'p-site-1',
      });

      expect(prisma.placementTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requesterId: 'req-1',
            selectedProviderId: 'provider-1',
            lifecycleStatus: 'ASSIGNED',
          }),
        }),
      );
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'req-1',
        }),
      );
      expect(result.data!.updatedRequest.status).toBe(DirectTaskRequestStatus.ACCEPTED);
    });
  });

  describe('rejectDirectRequest', () => {
    it('should update status to REJECTED and refund reserved credits', async () => {
      prisma.directTaskRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        requesterId: 'req-1',
        requesterWebsiteId: 'r-site-1',
        targetProviderId: 'provider-1',
        status: DirectTaskRequestStatus.PENDING,
        reservedCreditAmount: 2,
        walletType: 'SUBSCRIPTION',
        projectTitle: 'Direct Guest Post',
      });

      const result = await service.rejectDirectRequest('provider-1', 'req-1', {
        rejectionReason: 'Too busy',
      });

      expect(creditTaskService.refundTaskCredit).toHaveBeenCalledWith(
        'req-1',
        expect.objectContaining({
          creditAmount: 2,
          walletType: 'SUBSCRIPTION',
        }),
      );
      expect(result.data!.status).toBe(DirectTaskRequestStatus.REJECTED);
    });
  });

  describe('cancelDirectRequest', () => {
    it('should update status to CANCELLED and refund reserved credits', async () => {
      prisma.directTaskRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        requesterId: 'req-1',
        requesterWebsiteId: 'r-site-1',
        targetProviderId: 'provider-1',
        status: DirectTaskRequestStatus.PENDING,
        reservedCreditAmount: 2,
        walletType: 'SUBSCRIPTION',
        projectTitle: 'Direct Guest Post',
      });

      const result = await service.cancelDirectRequest('req-1', 'req-1', {
        cancellationReason: 'Changed mind',
      });

      expect(creditTaskService.refundTaskCredit).toHaveBeenCalledWith(
        'req-1',
        expect.objectContaining({
          creditAmount: 2,
          walletType: 'SUBSCRIPTION',
        }),
      );
      expect(result.data!.status).toBe(DirectTaskRequestStatus.CANCELLED);
    });
  });
});
