import { ConfigService } from '@nestjs/config';

/**
 * Feature flags controlling whether marketplace scoring / opportunity-alert
 * bursts are routed through BullMQ workers (async) or run synchronously inline.
 *
 * Defaults: async (queued) path enabled. Set the env var to `false` to fall
 * back to the synchronous engine call for low-volume / single-instance setups.
 */
export const MARKETPLACE_QUEUE_FLAGS = {
  SCORING_ASYNC: 'MARKETPLACE_SCORING_ASYNC',
  OPPORTUNITY_ALERT_ASYNC: 'MARKETPLACE_OPPORTUNITY_ALERT_ASYNC',
} as const;

export function isScoringAsync(configService: ConfigService): boolean {
  return (
    configService.get<string>(MARKETPLACE_QUEUE_FLAGS.SCORING_ASYNC, 'true') !==
    'false'
  );
}

export function isOpportunityAlertAsync(configService: ConfigService): boolean {
  return (
    configService.get<string>(
      MARKETPLACE_QUEUE_FLAGS.OPPORTUNITY_ALERT_ASYNC,
      'true',
    ) !== 'false'
  );
}
