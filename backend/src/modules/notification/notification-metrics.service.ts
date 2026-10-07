import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

export type NotificationMetric = {
  id: string;
  notificationType: NotificationType;
  channel: 'IN_APP' | 'PUSH' | 'EMAIL';
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRYING';
  latencyMs: number;
  errorMessage?: string;
  createdAt: Date;
};

@Injectable()
export class NotificationMetricsService {
  private readonly logger = new Logger(NotificationMetricsService.name);

  // In-memory store
  private metrics: NotificationMetric[] = [];

  recordMetric(metric: NotificationMetric) {
    this.metrics.push(metric);

    // Periodically clean up old metrics (keep only last 30 days in memory to prevent OOM)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter((m) => m.createdAt > thirtyDaysAgo);
  }

  getDeliveryMetrics() {
    const now = Date.now();
    const periods = {
      last24Hours: new Date(now - 24 * 60 * 60 * 1000),
      last7Days: new Date(now - 7 * 24 * 60 * 60 * 1000),
      last30Days: new Date(now - 30 * 24 * 60 * 60 * 1000),
    };

    const aggregate = (since: Date) => {
      const filtered = this.metrics.filter((m) => m.createdAt >= since);

      const totalSent = filtered.length;
      const totalDelivered = filtered.filter(
        (m) => m.status === 'DELIVERED',
      ).length;
      const totalFailed = filtered.filter((m) => m.status === 'FAILED').length;

      const latencySum = filtered.reduce(
        (sum, m) => sum + (m.latencyMs || 0),
        0,
      );
      const avgLatencyMs = totalSent > 0 ? latencySum / totalSent : 0;
      const failureRate = totalSent > 0 ? totalFailed / totalSent : 0;

      const byType: Record<string, number> = {};
      const byChannel: Record<string, number> = {};

      filtered.forEach((m) => {
        byType[m.notificationType] = (byType[m.notificationType] || 0) + 1;
        byChannel[m.channel] = (byChannel[m.channel] || 0) + 1;
      });

      return {
        totalSent,
        totalDelivered,
        totalFailed,
        avgLatencyMs,
        failureRate,
        byType,
        byChannel,
      };
    };

    return {
      last24Hours: aggregate(periods.last24Hours),
      last7Days: aggregate(periods.last7Days),
      last30Days: aggregate(periods.last30Days),
    };
  }
}
