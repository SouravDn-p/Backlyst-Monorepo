export const COMMUNITY_SHOWCASE_PHASE = 'foundation';

export function showcasePlaceholder(message: string) {
  return {
    implemented: false,
    phase: COMMUNITY_SHOWCASE_PHASE,
    message,
  };
}
