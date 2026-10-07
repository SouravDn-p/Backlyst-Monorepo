import { BadRequestException, Injectable } from '@nestjs/common';
import { AnalyticsRange } from '../enums/analytics.enums';
import { AnalyticsDateRange } from '../types/analytics.types';

const MAX_CUSTOM_RANGE_MS = 5 * 366 * 24 * 60 * 60 * 1000;

@Injectable()
export class AnalyticsDateRangeService {
  resolve(
    range = AnalyticsRange.MONTHLY,
    from?: string,
    to?: string,
  ): AnalyticsDateRange {
    if ((from && !to) || (!from && to)) {
      throw new BadRequestException(
        'Both from and to are required for a custom date range',
      );
    }

    if (from || to || range === AnalyticsRange.CUSTOM) {
      if (!from || !to) {
        throw new BadRequestException('CUSTOM range requires both from and to');
      }

      return this.customRange(from, to);
    }

    const now = new Date();
    const resolvedRange = range ?? AnalyticsRange.MONTHLY;
    const { start, end } = this.currentRange(resolvedRange, now);
    const previous = this.previousRange(start, end);

    return {
      range: resolvedRange,
      from: start,
      to: end,
      previousFrom: previous.from,
      previousTo: previous.to,
      display: this.displayRange(start, end),
    };
  }

  displayRange(from: Date, to: Date) {
    return `${from.toISOString()} - ${to.toISOString()}`;
  }

  private customRange(fromValue: string, toValue: string): AnalyticsDateRange {
    const from = new Date(fromValue);
    const to = new Date(toValue);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid from or to date');
    }

    if (from > to) {
      throw new BadRequestException('from must be before to');
    }

    if (to.getTime() - from.getTime() > MAX_CUSTOM_RANGE_MS) {
      throw new BadRequestException('Custom range cannot exceed five years');
    }

    const previous = this.previousRange(from, to);
    return {
      range: AnalyticsRange.CUSTOM,
      from,
      to,
      previousFrom: previous.from,
      previousTo: previous.to,
      display: this.displayRange(from, to),
    };
  }

  private currentRange(range: AnalyticsRange, now: Date) {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    let end = new Date(start);

    if (range === AnalyticsRange.DAILY) {
      end.setUTCHours(23, 59, 59, 999);
      return { start, end };
    }

    if (range === AnalyticsRange.WEEKLY) {
      const day = start.getUTCDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setUTCDate(start.getUTCDate() + diffToMonday);
      end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      return { start, end };
    }

    if (range === AnalyticsRange.MONTHLY) {
      start.setUTCDate(1);
      end = new Date(
        Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      );
      return { start, end };
    }

    if (range === AnalyticsRange.YEARLY) {
      start.setUTCMonth(0, 1);
      end = new Date(Date.UTC(start.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
      return { start, end };
    }

    throw new BadRequestException('Unsupported analytics range');
  }

  private previousRange(from: Date, to: Date) {
    const duration = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - duration);
    return { from: previousFrom, to: previousTo };
  }
}
