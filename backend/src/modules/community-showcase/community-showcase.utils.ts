import { BadRequestException } from '@nestjs/common';
import { RankingPeriod } from '@prisma/client';

export function getPeriodDateRange(period: RankingPeriod) {
  const now = new Date();
  const from = new Date(now);

  switch (period) {
    case RankingPeriod.THIS_WEEK: {
      const day = from.getUTCDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      from.setUTCDate(from.getUTCDate() + diffToMonday);
      from.setUTCHours(0, 0, 0, 0);
      break;
    }
    case RankingPeriod.THIS_MONTH:
      from.setUTCDate(1);
      from.setUTCHours(0, 0, 0, 0);
      break;
    case RankingPeriod.LAST_30_DAYS:
      from.setUTCDate(from.getUTCDate() - 30);
      break;
    case RankingPeriod.THIS_YEAR:
      from.setUTCMonth(0, 1);
      from.setUTCHours(0, 0, 0, 0);
      break;
    case RankingPeriod.ALL_TIME:
      return null;
    default:
      return null;
  }

  return { from, to: now };
}

export function normalizePagination(page?: number, limit?: number, maxLimit = 100) {
  const normalizedPage = Math.max(1, page ?? 1);
  const normalizedLimit = Math.max(1, Math.min(maxLimit, limit ?? 20));
  const skip = (normalizedPage - 1) * normalizedLimit;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip,
  };
}

export function normalizeDomainLike(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
  const withoutPath = withoutProtocol.split('/')[0] ?? withoutProtocol;
  return withoutPath.replace(/^www\./i, '').toLowerCase();
}

export function safeDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date value');
  }

  return date;
}

export function clampGenerationLimit(limit?: number) {
  return Math.max(1, Math.min(200, limit ?? 100));
}
