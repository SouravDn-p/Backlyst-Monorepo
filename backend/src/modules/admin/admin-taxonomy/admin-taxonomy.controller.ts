import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminTaxonomyService } from './admin-taxonomy.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTagDto,
  UpdateTagDto,
  CreateCategoryRelationDto,
} from './dto/admin-taxonomy.dto';

@ApiTags('Admin Taxonomy (Marketplace)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/taxonomy')
export class AdminTaxonomyController {
  constructor(private readonly taxonomyService: AdminTaxonomyService) {}

  @Post('categories')
  @ApiOperation({ summary: 'Create a new marketplace category' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.taxonomyService.createCategory(dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all marketplace categories' })
  listCategories() {
    return this.taxonomyService.listCategories();
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a marketplace category' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.taxonomyService.updateCategory(id, dto);
  }

  @Post('tags')
  @ApiOperation({ summary: 'Create a new marketplace tag' })
  createTag(@Body() dto: CreateTagDto) {
    return this.taxonomyService.createTag(dto);
  }

  @Get('tags')
  @ApiOperation({ summary: 'List all marketplace tags' })
  listTags() {
    return this.taxonomyService.listTags();
  }

  @Patch('tags/:id')
  @ApiOperation({ summary: 'Update a marketplace tag' })
  updateTag(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.taxonomyService.updateTag(id, dto);
  }

  @Post('categories/:id/relations')
  @ApiOperation({ summary: 'Create a relationship between categories' })
  createCategoryRelation(
    @Param('id') sourceId: string,
    @Body() dto: CreateCategoryRelationDto,
  ) {
    return this.taxonomyService.createCategoryRelation(sourceId, dto);
  }
}
