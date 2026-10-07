export const BULLMQ_DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1_000,
  },
  removeOnComplete: 1_000,
  removeOnFail: 5_000,
};
