export type MarketplaceValidationContext =
  | 'GENERATE'
  | 'APPLY'
  | 'ACCEPT'
  | 'ASSIGN'
  | 'APPROVE'
  | 'COMPLETE'
  | 'ADMIN_ASSIGN'
  | 'ADMIN_FORCE'
  | 'ADMIN_FORCE_MATCH'
  | 'PROVIDER_APPLICATION'
  | 'WEBHOOK_COMPLETE'
  | 'RECONCILE';

export type ValidationDecision =
  'APPROVED' | 'APPROVED_WITH_RESTRICTIONS' | 'REJECTED';

export interface ValidationResult {
  decision: ValidationDecision;
  stage: MarketplaceValidationContext;
  failedRules: string[]; // internal only — never return to client
  restrictions: string[]; // e.g. LOW_VISIBILITY, LOW_PRIORITY
  overrideApplied: boolean;
  publicMessage: string; // safe message (spec §13)
  /**
   * Audit R-Repeat-1: non-user-facing signal indicating whether a repeat-pair
   * (same-direction) or reciprocal (reverse-direction) block produced the
   * failure, so governance dashboards can distinguish the two. The end-user
   * `publicMessage` remains generic; this field is for internal observability
   * only and must never be returned to clients.
   */
  blockedReason?: 'REPEAT' | 'RECIPROCAL' | null;
  /**
   * Audit R-Repeat-3: isolated processing time (ms) of the Level 2 cooldown
   * checks (repeat + reciprocal + concentration + pattern-flag), so the
   * repeat-pair validation path can be monitored independently of the overall
   * matching time. Best-effort; absent if timing was not captured.
   */
  cooldownCheckMs?: number;
}

// Safe public messages (spec §13, §29): varied to prevent scraping based on static error strings.
export const SAFE_MESSAGES = {
  COOLDOWN: [
    'This opportunity is currently unavailable.',
    'This match is temporarily hidden.',
    'You cannot access this opportunity right now.',
  ],
  LIMIT: [
    'No suitable opportunities are currently available.',
    'We could not find any matches at this time.',
    'Please check back later for new opportunities.',
  ],
  ELIGIBILITY: [
    'This opportunity is currently unavailable.',
    'This match requires a different profile setup.',
    'Your current profile does not meet the requirements for this task.',
  ],
  GENERIC: [
    'This opportunity is currently unavailable.',
    'An issue occurred while retrieving this match.',
    'Please try a different opportunity.',
  ],
} as const;

export function getSafeMessage(category: keyof typeof SAFE_MESSAGES): string {
  const messages = SAFE_MESSAGES[category];
  return messages[Math.floor(Math.random() * messages.length)];
}
