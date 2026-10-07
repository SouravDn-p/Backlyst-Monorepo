import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CreateWebsiteCategoryKeyDto } from './dto/create-website-category-key.dto';

@Injectable()
export class WebsiteCategoryKeyService {
  constructor(private readonly prisma: PrismaService) { }

  async create(payload: CreateWebsiteCategoryKeyDto) {
    const key = payload.key.trim();

    const isAlreadyExist = await this.prisma.marketplaceCategory.findUnique({
      where: { slug: key },
      select: { id: true },
    });

    if (isAlreadyExist) {
      throw new ConflictException('Website category key already exists');
    }

    try {
      const data = await this.prisma.marketplaceCategory.create({
        data: {
          slug: key,
          name: key, // Map key to name as well
          enabled: true,
        },
      });

      return sendResponse('Website category key created successfully', data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Website category key already exists');
      }

      throw error;
    }
  }

  async findAll() {
    const data = await this.prisma.marketplaceCategory.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // To keep backward compatibility with clients expecting 'key',
    // map 'slug' back to 'key' in the response.
    const mappedData = data.map(item => ({
      ...item,
      key: item.slug,
    }));

    return sendResponse('Website category keys fetched successfully', mappedData);
  }

  async update(id: string, payload: CreateWebsiteCategoryKeyDto) {
    const key = payload.key.trim();

    const categoryKey = await this.prisma.marketplaceCategory.findUnique({
      where: { id },
    });

    if (!categoryKey) {
      throw new NotFoundException('Website category key not found');
    }

    const isAlreadyExist = await this.prisma.marketplaceCategory.findFirst({
      where: {
        slug: key,
        id: {
          not: id,
        },
      },
      select: { id: true },
    });

    if (isAlreadyExist) {
      throw new ConflictException('Website category key already exists');
    }

    try {
      const data = await this.prisma.marketplaceCategory.update({
        where: { id },
        data: {
          slug: key,
          name: key,
        },
      });

      return sendResponse('Website category key updated successfully', data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Website category key already exists');
      }

      throw error;
    }
  }

  async remove(id: string) {
    const categoryKey = await this.prisma.marketplaceCategory.findUnique({
      where: { id },
    });

    if (!categoryKey) {
      throw new NotFoundException('Website category key not found');
    }

    // Check if the category is used by any active website via the join table
    const activeWebsite = await this.prisma.websiteMarketplaceCategory.findFirst({
      where: {
        categoryId: id,
      },
      select: { id: true },
    });

    if (activeWebsite) {
      throw new ConflictException(
        'Cannot delete category key as it is currently in use by one or more websites',
      );
    }

    await this.prisma.marketplaceCategory.delete({
      where: { id },
    });

    return sendResponse('Website category key deleted successfully');
  }

}