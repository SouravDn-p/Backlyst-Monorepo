import { NotificationCategory, NotificationType } from '@prisma/client';

const typeToTemplate: Partial<
  Record<NotificationType, { title: string; body: string }>
> = {
  TASK_APPROVED: {
    title: 'Task approved',
    body: 'Your task has been approved.',
  },
  TASK_REVISION_REQUESTED: {
    title: 'Revision requested',
    body: 'A revision was requested for your submitted work.',
  },
  CREDIT_LOW_BALANCE: {
    title: 'Low credit balance',
    body: 'Your credit balance is low.',
  },
  BADGE_UNLOCKED: {
    title: 'Badge unlocked',
    body: 'You unlocked a new badge.',
  },
  MARKETPLACE_NEW_OPPORTUNITY: {
    title: 'New opportunity available',
    body: 'A new opportunity is available for your website.',
  },
  ADMIN_DISPUTE_OPENED: {
    title: 'New dispute opened',
    body: 'A task dispute requires admin review.',
  },
  ADMIN_CREDIT_LEDGER_ALERT: {
    title: 'Credit ledger alert',
    body: 'A credit event requires admin attention.',
  },
  SYSTEM_ANNOUNCEMENT: {
    title: 'System announcement',
    body: 'A new system announcement is available.',
  },
};

export function getNotificationTemplate(type: NotificationType) {
  return (
    typeToTemplate[type] ?? {
      title: type
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      body: 'You have a new notification.',
    }
  );
}

export function inferNotificationCategory(type: NotificationType) {
  if (type.startsWith('TASK_')) return NotificationCategory.TASK_STATUS;
  if (type.startsWith('CREDIT_')) return NotificationCategory.CREDIT_BALANCE;
  if (type.includes('DISPUTE')) return NotificationCategory.DISPUTE_REVIEW;
  if (type.startsWith('MESSAGE_')) return NotificationCategory.MESSAGE;
  if (
    type.includes('REWARD') ||
    type.includes('BADGE') ||
    type.includes('MILESTONE') ||
    type.includes('STREAK')
  ) {
    return NotificationCategory.REWARD;
  }
  if (type.startsWith('MARKETPLACE_')) return NotificationCategory.MARKETPLACE;
  if (type.startsWith('ADMIN_CREDIT')) return NotificationCategory.ADMIN_LEDGER;
  if (
    type.startsWith('ADMIN_DISPUTE') ||
    type.startsWith('ADMIN_MESSAGE') ||
    type.startsWith('ADMIN_WEBSITE')
  ) {
    return NotificationCategory.ADMIN_GOVERNANCE;
  }
  if (
    type.includes('RISK') ||
    type.includes('LIQUIDITY') ||
    type.includes('IMBALANCE')
  )
    return NotificationCategory.ADMIN_RISK;
  if (type.startsWith('ADMIN_SYSTEM') || type.startsWith('ADMIN_AUDIT'))
    return NotificationCategory.ADMIN_SYSTEM;
  return NotificationCategory.SYSTEM_ANNOUNCEMENT;
}
