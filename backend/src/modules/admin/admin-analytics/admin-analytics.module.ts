import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DistributionEngine } from 'src/modules/task/market-algoritm/distribution-engine.service';
import { TierEngine } from 'src/modules/task/market-algoritm/tier-engine.service';
import { ValidationEngine } from 'src/modules/task/market-algoritm/validation.engine';
import { AnalyticsEngine } from 'src/modules/task/market-algoritm/analytics.engine';
import { MarketplaceEngineModule } from 'src/modules/task/marketplace-engine/marketplace-engine.module';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AnalyticsDateRangeService } from './services/analytics-date-range.service';
import { AnalyticsExportService } from './services/analytics-export.service';
import { AnalyticsReportBuilderService } from './services/analytics-report-builder.service';
import { LiquidityService } from './services/liquidity.service';
import { PatternFlagService } from './services/pattern-flag.service';
import { SavedAnalyticsReportService } from './services/saved-analytics-report.service';
import { MarketplaceAnalyticsDashboardService } from './marketplace-analytics-dashboard.service';
import { NotificationModule } from 'src/modules/notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule, MarketplaceEngineModule],
  controllers: [AdminAnalyticsController],
  providers: [
    AdminAnalyticsService,
    AnalyticsDateRangeService,
    AnalyticsExportService,
    AnalyticsReportBuilderService,
    SavedAnalyticsReportService,
    LiquidityService,
    PatternFlagService,
    ValidationEngine,
    TierEngine,
    DistributionEngine,
    AnalyticsEngine,
    MarketplaceAnalyticsDashboardService,
  ],
})
export class AdminAnalyticsModule {}
