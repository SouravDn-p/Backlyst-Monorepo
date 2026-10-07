import { AnalyticsRange } from './enums/analytics.enums';
import { AnalyticsDateRangeService } from './services/analytics-date-range.service';
import { analyticsToCsv } from './utils/analytics-csv-flattener.util';
import { sanitizeFilenamePart } from './utils/analytics-filename.util';
import { calculateRate, calculateTrend } from './utils/analytics-rate.util';

describe('Admin analytics utilities', () => {
  it('calculates safe rates with zero denominator', () => {
    expect(calculateRate(10, 0)).toBe(0);
    expect(calculateRate(1, 4)).toBe(25);
  });

  it('calculates trend edge cases', () => {
    expect(calculateTrend(0, 0)).toEqual({
      current: 0,
      previous: 0,
      trendPercent: 0,
      trendDirection: 'FLAT',
    });
    expect(calculateTrend(5, 0)).toEqual({
      current: 5,
      previous: 0,
      trendPercent: null,
      trendDirection: 'NEW',
    });
  });

  it('rejects incomplete custom date ranges', () => {
    const service = new AnalyticsDateRangeService();
    expect(() => service.resolve(AnalyticsRange.CUSTOM)).toThrow(
      'CUSTOM range requires both from and to',
    );
    expect(() =>
      service.resolve(AnalyticsRange.MONTHLY, '2026-06-01T00:00:00.000Z'),
    ).toThrow('Both from and to are required for a custom date range');
  });

  it('resolves a valid custom date range with previous period', () => {
    const service = new AnalyticsDateRangeService();
    const range = service.resolve(
      AnalyticsRange.CUSTOM,
      '2026-06-10T00:00:00.000Z',
      '2026-06-11T00:00:00.000Z',
    );

    expect(range.range).toBe(AnalyticsRange.CUSTOM);
    expect(range.previousTo.toISOString()).toBe('2026-06-09T23:59:59.999Z');
  });

  it('sanitizes filenames', () => {
    expect(sanitizeFilenamePart('ANR Report: June / Full Summary')).toBe(
      'anr-report-june-full-summary',
    );
  });

  it('flattens analytics reports to normalized CSV', () => {
    const csv = analyticsToCsv([
      {
        metadata: {
          reportType: 'TASK_LIFECYCLE_RISK',
          reportName: 'Task Lifecycle and Risk',
          from: '2026-06-01T00:00:00.000Z',
          to: '2026-06-30T23:59:59.999Z',
          generatedAt: '2026-06-24T00:00:00.000Z',
        },
        summary: { created: 10 },
      },
    ]);

    expect(csv).toContain('reportType,reportName,section');
    expect(csv).toContain('TASK_LIFECYCLE_RISK');
    expect(csv).toContain('summary');
  });
});
