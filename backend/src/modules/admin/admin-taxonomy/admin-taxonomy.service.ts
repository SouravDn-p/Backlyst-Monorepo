import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { sendResponse } from '../../../utils/sendResponse';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTagDto,
  UpdateTagDto,
  CreateCategoryRelationDto,
} from './dto/admin-taxonomy.dto';

@Injectable()
export class AdminTaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(dto: CreateCategoryDto) {
    const exists = await this.prisma.marketplaceCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (exists)
      throw new ConflictException('Category with this slug already exists');

    if (dto.parentId) {
      const parent = await this.prisma.marketplaceCategory.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    const category = await this.prisma.marketplaceCategory.create({
      data: dto,
    });
    return sendResponse('Marketplace category created successfully', category);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    if (dto.slug) {
      const exists = await this.prisma.marketplaceCategory.findUnique({
        where: { slug: dto.slug },
      });
      if (exists && exists.id !== id)
        throw new ConflictException('Slug already in use');
    }

    if (dto.parentId) {
      const parent = await this.prisma.marketplaceCategory.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    const category = await this.prisma.marketplaceCategory.update({
      where: { id },
      data: dto,
    });
    return sendResponse('Marketplace category updated successfully', category);
  }

  async listCategories() {
    const categories = await this.prisma.marketplaceCategory.findMany({
      orderBy: { name: 'asc' },
    });
    return sendResponse(
      'Marketplace categories fetched successfully',
      categories,
    );
  }

  async createTag(dto: CreateTagDto) {
    const exists = await this.prisma.marketplaceTag.findUnique({
      where: { slug: dto.slug },
    });
    if (exists)
      throw new ConflictException('Tag with this slug already exists');

    const tag = await this.prisma.marketplaceTag.create({
      data: dto,
    });
    return sendResponse('Marketplace tag created successfully', tag);
  }

  async updateTag(id: string, dto: UpdateTagDto) {
    if (dto.slug) {
      const exists = await this.prisma.marketplaceTag.findUnique({
        where: { slug: dto.slug },
      });
      if (exists && exists.id !== id)
        throw new ConflictException('Slug already in use');
    }

    const tag = await this.prisma.marketplaceTag.update({
      where: { id },
      data: dto,
    });
    return sendResponse('Marketplace tag updated successfully', tag);
  }

  async listTags() {
    const tags = await this.prisma.marketplaceTag.findMany({
      orderBy: { name: 'asc' },
    });
    return sendResponse('Marketplace tags fetched successfully', tags);
  }

  async createCategoryRelation(
    sourceId: string,
    dto: CreateCategoryRelationDto,
  ) {
    const source = await this.prisma.marketplaceCategory.findUnique({
      where: { id: sourceId },
    });
    if (!source) throw new NotFoundException('Source category not found');
    const target = await this.prisma.marketplaceCategory.findUnique({
      where: { id: dto.targetId },
    });
    if (!target) throw new NotFoundException('Target category not found');

    const relation = await this.prisma.marketplaceCategoryRelation.create({
      data: {
        sourceId,
        targetId: dto.targetId,
        relationshipType: dto.relationshipType,
        weight: dto.weight ?? 1.0,
      },
    });

    return sendResponse('Category relation created successfully', relation);
  }
}
