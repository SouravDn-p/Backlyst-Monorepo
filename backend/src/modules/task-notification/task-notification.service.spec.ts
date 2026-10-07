import {
  NotificationCategory,
  NotificationEntityType,
  NotificationType,
} from '@prisma/client';
import { TaskNotificationTrigger } from './enums/task-notification-trigger.enum';
import { TaskNotificationService } from './task-notification.service';
import { TASK_NOTIFICATION_TRIGGER_MAP } from './utils/task-notification-map.util';

const task = {
  id: 'task-1',
  projectTitle: 'Guest post campaign',
  requesterId: 'requester-1',
  selectedProviderId: 'provider-1',
  assignedProviderWebsiteId: 'provider-website-1',
};

function createService() {
  const notificationService = {
    sendNotification: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  };
  const service = new TaskNotificationService(notificationService as any);
  return { service, notificationService };
}

describe('TaskNotificationService', () => {
  it('has map entries for every trigger and no routeBuilder/bulk helper config', () => {
    for (const trigger of Object.values(TaskNotificationTrigger)) {
      expect(TASK_NOTIFICATION_TRIGGER_MAP[trigger]).toBeDefined();
    }

    const serializedMap = JSON.stringify(TASK_NOTIFICATION_TRIGGER_MAP);
    expect(serializedMap).not.toContain('routeBuilder');
    expect(serializedMap).not.toContain('bulk');
  });

  it('uses exact requesterId for requester triggers', async () => {
    const { service, notificationService } = createService();

    await service.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_TASK_CREATED,
      task,
      requesterId: 'requester-123',
      actorId: 'requester-123',
    });

    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'requester-123',
        type: NotificationType.TASK_CREATED,
        category: NotificationCategory.TASK_STATUS,
        entityType: NotificationEntityType.TASK,
        entityId: task.id,
        idempotencyKey:
          'task-notification-REQUESTER_TASK_CREATED-task-1-requester-123',
      }),
    );
  });

  it('uses exact providerId for provider triggers', async () => {
    const { service, notificationService } = createService();

    await service.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_ASSIGNED,
      task,
      providerId: 'provider-123',
      providerWebsiteId: 'website-123',
      actorId: 'requester-1',
    });

    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'provider-123',
        type: NotificationType.TASK_PROVIDER_SELECTED,
        category: NotificationCategory.TASK_STATUS,
        entityType: NotificationEntityType.TASK,
        entityId: task.id,
        idempotencyKey:
          'task-notification-PROVIDER_TASK_ASSIGNED-task-1-provider-123',
      }),
    );
  });

  it('returns skipped result when exact recipient is missing', async () => {
    const { service, notificationService } = createService();

    const result = await service.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_ASSIGNED,
      task,
    });

    expect(result).toEqual(
      expect.objectContaining({
        skipped: true,
        reason: 'Missing provider recipient id',
      }),
    );
    expect(notificationService.sendNotification).not.toHaveBeenCalled();
  });

  it('includes action, trigger, task, actor, and extra data in payload', async () => {
    const { service, notificationService } = createService();

    await service.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_PROOF_SUBMITTED,
      task,
      requesterId: 'requester-1',
      providerId: 'provider-1',
      providerWebsiteId: 'provider-website-1',
      actorId: 'provider-1',
      extraData: { submissionId: 'submission-1' },
    });

    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'provider-1',
        type: NotificationType.TASK_PROOF_SUBMITTED,
        data: expect.objectContaining({
          taskId: 'task-1',
          taskTitle: 'Guest post campaign',
          requesterId: 'requester-1',
          providerId: 'provider-1',
          providerWebsiteId: 'provider-website-1',
          action: 'REVIEW_PROOF',
          trigger: TaskNotificationTrigger.REQUESTER_PROOF_SUBMITTED,
          extraData: { submissionId: 'submission-1' },
        }),
      }),
    );
  });

  it('allows custom title/body overrides', async () => {
    const { service, notificationService } = createService();

    await service.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_APPROVED,
      task,
      providerId: 'provider-1',
      title: 'Custom title',
      body: 'Custom body',
    });

    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Custom title', body: 'Custom body' }),
    );
  });

  it('logs and skips when NotificationService fails', async () => {
    const { service, notificationService } = createService();
    notificationService.sendNotification.mockRejectedValueOnce(
      new Error('queue unavailable'),
    );

    const result = await service.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_APPROVED,
      task,
      providerId: 'provider-1',
    });

    expect(result).toEqual(
      expect.objectContaining({
        skipped: true,
        reason: 'Notification delivery failed',
        recipientId: 'provider-1',
      }),
    );
  });
});
