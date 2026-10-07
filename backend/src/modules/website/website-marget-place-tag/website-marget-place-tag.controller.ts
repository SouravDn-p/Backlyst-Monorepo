import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { Public } from 'src/common/decorator/public.decorator';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { CreateWebsiteMargetPlaceTagDto } from './dto/create-website-marget-place-tag.dto';
import { WebsiteMargetPlaceTagService } from './website-marget-place-tag.service';

@ApiTags('Website Marketplace Tags')
@Controller()
export class WebsiteMargetPlaceTagController {
  constructor(
    private readonly websiteMargetPlaceTagService: WebsiteMargetPlaceTagService,
  ) {}

  @Post('admin/website-marketplace-tags')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Create website marketplace tag' })
  create(@Body() payload: CreateWebsiteMargetPlaceTagDto) {
    return this.websiteMargetPlaceTagService.create(payload);
  }

  @Get('website-marketplace-tags')
  @Public()
  @ApiOperation({ summary: 'Get website marketplace tags publicly' })
  findAll() {
    return this.websiteMargetPlaceTagService.findAll();
  }

  @Get('website-marketplace-tags/:id')
  @Public()
  @ApiOperation({ summary: 'Get website marketplace tag by id publicly' })
  findOne(@Param('id') id: string) {
    return this.websiteMargetPlaceTagService.findOne(id);
  }

  @Patch('admin/website-marketplace-tags/:id')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Update website marketplace tag' })
  update(
    @Param('id') id: string,
    @Body() payload: CreateWebsiteMargetPlaceTagDto,
  ) {
    return this.websiteMargetPlaceTagService.update(id, payload);
  }

  @Delete('admin/website-marketplace-tags/:id')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Delete website marketplace tag' })
  remove(@Param('id') id: string) {
    return this.websiteMargetPlaceTagService.remove(id);
  }
}
