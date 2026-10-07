export const QUEUE_NAMES = {
  AUTH: 'auth',
  MESSAGING: 'messaging',
  REWARDS: 'rewards',
  NOTIFICATION: 'notification-delivery',
  MARKETPLACE_SCORING: 'marketplace-scoring',
  OPPORTUNITY_ALERT: 'opportunity-alert',
  MARKETPLACE_MAINTENANCE: 'marketplace-maintenance',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const AUTH_QUEUE_JOB_NAMES = {
  PLACEHOLDER: 'auth.placeholder',
} as const;

export const MESSAGING_QUEUE_JOB_NAMES = {
  CREATE_MESSAGE: 'messaging.create-message',
} as const;

export const REWARDS_QUEUE_JOB_NAMES = {
  CHECK_STREAKS: 'rewards.check-streaks',
} as const;

export const NOTIFICATION_QUEUE_JOB_NAMES = {
  EMIT_REALTIME: 'notification.emit-realtime',
  BULK_EMIT_REALTIME: 'notification.bulk-emit-realtime',
  RETRY_FAILED: 'notification.retry-failed',
  CLEANUP_OLD_READ: 'notification.cleanup-old-read',
} as const;

export const MARKETPLACE_SCORING_QUEUE_JOB_NAMES = {
  UPDATE_SCORES: 'marketplace-scoring.update-scores',
} as const;

export const OPPORTUNITY_ALERT_QUEUE_JOB_NAMES = {
  ALERT_MATCHING_PROVIDERS: 'opportunity-alert.alert-matching-providers',
} as const;

export const MARKETPLACE_MAINTENANCE_JOB_NAMES = {
  UPDATE_OPPORTUNITY_SCORES:
    'marketplace-maintenance:update-opportunity-scores',
  DECAY_BOOST_FACTORS: 'marketplace-maintenance:decay-boost-factors',
  EXPIRE_OVERRIDES: 'marketplace-maintenance:expire-overrides',
  CLEANUP_IMPRESSIONS: 'marketplace-maintenance:cleanup-impressions',
  FLAG_NEGLECTED_WEBSITES: 'marketplace-maintenance:flag-neglected-websites',
  RECALC_QUALITY: 'marketplace-maintenance:recalc-quality',
  RECALC_BEHAVIOUR: 'marketplace-maintenance:recalc-behaviour',
  REBALANCE_SUPPLY_DEMAND: 'marketplace-maintenance:rebalance-supply-demand',
  MONITOR_PATTERNS: 'marketplace-maintenance:monitor-patterns',
  RETAIN_RELATIONSHIPS: 'marketplace-maintenance:retain-relationships',
  DECAY_RISK_SCORES: 'marketplace-maintenance:decay-risk-scores',
  EXPIRE_TASKS: 'marketplace-maintenance:expire-tasks',
  SCAN_OPPORTUNITIES: 'marketplace-maintenance:scan-opportunities',
  MAINTAIN_VISIBILITY: 'marketplace-maintenance:maintain-visibility',
  REMINDER_PROVIDER_RESPONSE:
    'marketplace-maintenance:reminder-provider-response',
  REMINDER_REQUESTER_REVIEW:
    'marketplace-maintenance:reminder-requester-review',
  REMINDER_OVERDUE_ESCALATION:
    'marketplace-maintenance:reminder-overdue-escalation',
} as const;
