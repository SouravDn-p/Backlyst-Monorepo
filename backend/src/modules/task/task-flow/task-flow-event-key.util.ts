export const taskFlowEventKey = {
  taskCreated: (taskId: string) => `task:${taskId}:created`,
  taskPublished: (taskId: string) => `task:${taskId}:published`,
  requestedDeadlineUpdated: (
    taskId: string,
    actorId: string,
    timestamp: Date,
  ) =>
    `task:${taskId}:requested-deadline-updated:${actorId}:${timestamp.toISOString()}`,
  providerApplied: (taskId: string, providerId: string) =>
    `task:${taskId}:provider-applied:${providerId}`,
  providerSelected: (taskId: string, providerId: string) =>
    `task:${taskId}:provider-selected:${providerId}`,
  applicationRejected: (taskId: string, providerId: string) =>
    `task:${taskId}:application-rejected:${providerId}`,
  providerProofUploaded: (
    taskId: string,
    providerId: string,
    timestamp: Date,
  ) =>
    `task:${taskId}:provider-proof-uploaded:${providerId}:${timestamp.toISOString()}`,
  workStarted: (taskId: string, providerId: string) =>
    `task:${taskId}:work-started:${providerId}`,
  workSubmitted: (taskId: string, providerId: string, submittedAt: Date) =>
    `task:${taskId}:work-submitted:${providerId}:${submittedAt.toISOString()}`,
  workResubmitted: (taskId: string, providerId: string, submittedAt: Date) =>
    `task:${taskId}:work-resubmitted:${providerId}:${submittedAt.toISOString()}`,
  cancellationRequested: (taskId: string, actorId: string, timestamp: Date) =>
    `task:${taskId}:cancel-requested:${actorId}:${timestamp.toISOString()}`,
  cancellationAccepted: (taskId: string, providerId: string) =>
    `task:${taskId}:cancel-accepted:${providerId}`,
  cancellationRejected: (taskId: string, providerId: string) =>
    `task:${taskId}:cancel-rejected:${providerId}`,
  revisionRequested: (taskId: string, timestamp: Date) =>
    `task:${taskId}:revision-requested:${timestamp.toISOString()}`,
  approved: (taskId: string) => `task:${taskId}:approved`,
  completed: (taskId: string) => `task:${taskId}:completed`,
  rejected: (taskId: string) => `task:${taskId}:rejected`,
  disputed: (taskId: string) => `task:${taskId}:disputed`,
  cancelled: (taskId: string) => `task:${taskId}:cancelled`,
  taskFrozen: (taskId: string, adminId: string, timestamp: Date) =>
    `task:${taskId}:frozen:${adminId}:${timestamp.toISOString()}`,
  adminStatusOverride: (
    taskId: string,
    adminId: string,
    toStatus: string,
    timestamp: Date,
  ) =>
    `task:${taskId}:admin-status-override:${adminId}:${toStatus}:${timestamp.toISOString()}`,
  adminCreditAdjusted: (taskId: string, adminId: string, timestamp: Date) =>
    `task:${taskId}:admin-credit-adjusted:${adminId}:${timestamp.toISOString()}`,
  adminAbusePatternFlagged: (
    taskId: string,
    adminId: string,
    timestamp: Date,
  ) =>
    `task:${taskId}:admin-abuse-pattern-flagged:${adminId}:${timestamp.toISOString()}`,
  deadlineExtended: (taskId: string, extensionId: string) =>
    `task:${taskId}:deadline-extended:${extensionId}`,
  systemAction: (taskId: string, action: string, timestamp: Date) =>
    `task:${taskId}:system:${action}:${timestamp.toISOString()}`,
};
