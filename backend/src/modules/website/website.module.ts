import { Module } from '@nestjs/common';
import { WebsiteController } from './website.controller';
import { WebsiteService } from './website.service';
import { TaskRequesterModule } from '../task/task-requester/task-requester.module';
import { WebsiteCategoryKeyController } from './website-category/website-category-key.controller';
import { WebsiteCategoryKeyService } from './website-category/website-category-key.service';
import { WebsiteMargetPlaceTagController } from './website-marget-place-tag/website-marget-place-tag.controller';
import { WebsiteMargetPlaceTagService } from './website-marget-place-tag/website-marget-place-tag.service';

@Module({
  imports: [TaskRequesterModule],
  controllers: [
    WebsiteController,
    WebsiteCategoryKeyController,
    WebsiteMargetPlaceTagController,
  ],
  providers: [
    WebsiteService,
    WebsiteCategoryKeyService,
    WebsiteMargetPlaceTagService,
  ],
  exports: [WebsiteService],
})
export class WebsiteModule {}
