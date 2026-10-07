export function calculateRate(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export function calculateTrend(current: number, previous: number) {
  if (previous === 0 && current === 0) {
    return {
      current,
      previous,
      trendPercent: 0,
      trendDirection: 'FLAT' as const,
    };
  }

  if (previous === 0 && current > 0) {
    return {
      current,
      previous,
      trendPercent: null,
      trendDirection: 'NEW' as const,
    };
  }

  const trendPercent = Number(
    (((current - previous) / previous) * 100).toFixed(2),
  );
  const trendDirection =
    trendPercent > 0 ? 'UP' : trendPercent < 0 ? 'DOWN' : 'FLAT';

  return { current, previous, trendPercent, trendDirection };
}

export function average(numbers: number[]): number {
  if (!numbers.length) return 0;
  return Number(
    (numbers.reduce((sum, item) => sum + item, 0) / numbers.length).toFixed(2),
  );
}
