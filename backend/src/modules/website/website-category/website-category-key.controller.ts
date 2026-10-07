import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { Public } from 'src/common/decorator/public.decorator';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { CreateWebsiteCategoryKeyDto } from './dto/create-website-category-key.dto';
import { WebsiteCategoryKeyService } from './website-category-key.service';

@ApiTags('Website Category Keys')
@Controller()
export class WebsiteCategoryKeyController {
  constructor(
    private readonly websiteCategoryKeyService: WebsiteCategoryKeyService,
  ) { }

  @Post('admin/website-category-keys')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Create website category key' })
  create(@Body() payload: CreateWebsiteCategoryKeyDto) {
    return this.websiteCategoryKeyService.create(payload);
  }

  @Get('website-category-keys')
  @Public()
  @ApiOperation({ summary: 'Get website category keys publicly' })
  findAll() {
    return this.websiteCategoryKeyService.findAll();
  }

  @Patch('admin/website-category-keys/:id')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Update website category key' })
  update(
    @Param('id') id: string,
    @Body() payload: CreateWebsiteCategoryKeyDto,
  ) {
    return this.websiteCategoryKeyService.update(id, payload);
  }

  @Delete('admin/website-category-keys/:id')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Delete website category key' })
  remove(@Param('id') id: string) {
    return this.websiteCategoryKeyService.remove(id);
  }

}
