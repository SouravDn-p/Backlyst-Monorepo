import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CommunityShowcaseQueryDto } from './dto';
import { CommunityShowcaseService } from './services/community-showcase.service';

@ApiTags('Community Showcase')
@Controller('community')
export class CommunityShowcaseController {
  constructor(
    private readonly communityShowcaseService: CommunityShowcaseService,
  ) {}

  @Get('showcase/sections')
  @ApiOperation({ summary: 'Get supported public community showcase sections' })
  getSections() {
    return this.communityShowcaseService.getSections();
  }

  @Get('showcase')
  @ApiOperation({ summary: 'Get one public community showcase section' })
  @ApiQuery({ name: 'section', required: true, type: String })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'niche', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'badge', required: false, type: String })
  getShowcase(@Query() query: CommunityShowcaseQueryDto) {
    return this.communityShowcaseService.getShowcase(query);
  }

  @Get('members/:slug')
  @ApiOperation({ summary: 'Get one public community member profile' })
  @ApiParam({ name: 'slug', type: String, description: 'User id fallback until slugs are added' })
  getMemberProfile(@Param('slug') slug: string) {
    return this.communityShowcaseService.getPublicMemberProfile(slug);
  }

  @Get('websites/:slug')
  @ApiOperation({ summary: 'Get one public community website profile' })
  @ApiParam({ name: 'slug', type: String, description: 'Website id or domain-safe fallback until slugs are added' })
  getWebsiteProfile(@Param('slug') slug: string) {
    return this.communityShowcaseService.getPublicWebsiteProfile(slug);
  }
}
