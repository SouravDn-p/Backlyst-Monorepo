import { Module } from '@nestjs/common';
import { AdminAnalyticsModule } from './admin-analytics/admin-analytics.module';
import { AdminComplianceModule } from './admin-compliance/admin-compliance.module';
import { AdminCreditModule } from './admin-credit/admin-credit.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { AdminMarketplaceConfigModule } from './admin-marketplace-config/admin-marketplace-config.module';
import { AdminMarketplaceModeModule } from './admin-marketplace-mode/admin-marketplace-mode.module';
import { AdminManualMatchQueueModule } from './admin-manual-match-queue/admin-manual-match-queue.module';
import { AdminMarketplaceOverrideModule } from './admin-marketplace-override/admin-marketplace-override.module';
import { AdminMarketplaceVisibilityModule } from './admin-marketplace-visibility/admin-marketplace-visibility.module';
import { AdminWebsiteStatusModule } from './admin-website-status/admin-website-status.module';
import { AdminNicheCapModule } from './admin-niche-cap/admin-niche-cap.module';
import { AdminReferralModule } from './admin-referral/admin-referral.module';
import { AdminDomainPairInspectionModule } from './admin-domain-pair-inspection/admin-domain-pair-inspection.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PlatformFeatureToggleModule } from './platform-feature-toggle/platform-feature-toggle.module';
import { ReferralRewardConfigModule } from './referral-reward-config/referral-reward-config.module';
import { AdminTaxonomyModule } from './admin-taxonomy/admin-taxonomy.module';
import { AdminForensicAuditModule } from './admin-forensic-audit/admin-forensic-audit.module';
import { AdminAuthorizationModule } from './admin-authorization/admin-authorization.module';

@Module({
  imports: [
    AdminDashboardModule,
    AdminCreditModule,
    AdminComplianceModule,
    AdminAnalyticsModule,
    AdminReferralModule,
    AdminMarketplaceVisibilityModule,
    AdminMarketplaceConfigModule,
    AdminMarketplaceModeModule,
    AdminManualMatchQueueModule,
    AdminMarketplaceOverrideModule,
    AdminWebsiteStatusModule,
    AdminNicheCapModule,
    AdminDomainPairInspectionModule,
    ReferralRewardConfigModule,
    PlatformFeatureToggleModule,
    AdminTaxonomyModule,
    AdminForensicAuditModule,
    AdminAuthorizationModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
