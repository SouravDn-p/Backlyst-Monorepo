import { Module } from '@nestjs/common';
import { UploadFileModule } from 'src/common/upload-file/upload-file.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommunityShowcaseController } from './community-showcase.controller';
import { AdminCommunityShowcaseController } from './admin-community-showcase.controller';
import { CommunityShowcaseService } from './services/community-showcase.service';
import { CommunityRankingService } from './services/community-ranking.service';
import { CommunityRankingSnapshotService } from './services/community-ranking-snapshot.service';
import { UserShowcaseStatsService } from './services/user-showcase-stats.service';
import { WebsiteShowcaseStatsService } from './services/website-showcase-stats.service';
import { AdminShowcaseManagementService } from './services/admin-showcase-management.service';

@Module({
  imports: [PrismaModule, UploadFileModule],
  controllers: [CommunityShowcaseController, AdminCommunityShowcaseController],
  providers: [
    CommunityShowcaseService,
    CommunityRankingService,
    CommunityRankingSnapshotService,
    UserShowcaseStatsService,
    WebsiteShowcaseStatsService,
    AdminShowcaseManagementService,
  ],
  exports: [
    CommunityShowcaseService,
    CommunityRankingService,
    CommunityRankingSnapshotService,
    UserShowcaseStatsService,
    WebsiteShowcaseStatsService,
    AdminShowcaseManagementService,
  ],
})
export class CommunityShowcaseModule {}
