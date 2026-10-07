export const REWARDS_PHASE = 'foundation';

export function rewardsPlaceholder(message: string) {
  return {
    implemented: false,
    phase: REWARDS_PHASE,
    message,
  };
}
