import type { Prisma } from '@prisma/client';
import { TaskNotificationTrigger } from '../enums/task-notification-trigger.enum';

export type TaskNotificationRecipientRole = 'REQUESTER' | 'PROVIDER';

export type TaskNotificationTaskShape = {
  id: string;
  projectTitle?: string | null;
  title?: string | null;
  requesterId?: string | null;
  selectedProviderId?: string | null;
  assignedProviderWebsiteId?: string | null;
  lifecycleStatus?: string | null;
  submissionStatus?: string | null;
};

export type SendTaskNotificationInput = {
  trigger: TaskNotificationTrigger;
  task: TaskNotificationTaskShape;
  actorId?: string | null;
  requesterId?: string | null;
  providerId?: string | null;
  providerWebsiteId?: string | null;
  extraData?: Record<string, unknown>;
  title?: string;
  body?: string;
  idempotencyKey?: string | null;
};

export type TaskNotificationData = Prisma.InputJsonObject & {
  taskId: string;
  taskTitle?: string | null;
  requesterId?: string | null;
  providerId?: string | null;
  providerWebsiteId?: string | null;
  action: string;
  trigger: TaskNotificationTrigger;
  extraData?: Record<string, unknown>;
};
