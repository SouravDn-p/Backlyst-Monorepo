import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CreateWebsiteMargetPlaceTagDto } from './dto/create-website-marget-place-tag.dto';

@Injectable()
export class WebsiteMargetPlaceTagService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateWebsiteMargetPlaceTagDto) {
    const tag = payload.tag.trim();

    const isAlreadyExist = await this.prisma.marketplaceTag.findUnique({
      where: { slug: tag },
      select: { id: true },
    });

    if (isAlreadyExist) {
      throw new ConflictException('Website marketplace tag already exists');
    }

    try {
      const data = await this.prisma.marketplaceTag.create({
        data: {
          slug: tag,
          name: tag, // Map tag to name as well
          enabled: true,
        },
      });

      return sendResponse('Website marketplace tag created successfully', data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Website marketplace tag already exists');
      }

      throw error;
    }
  }

  async findAll() {
    const data = await this.prisma.marketplaceTag.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // To keep backward compatibility with clients expecting 'tag',
    // map 'slug' back to 'tag' in the response.
    const mappedData = data.map(item => ({
      ...item,
      tag: item.slug,
    }));

    return sendResponse('Website marketplace tags fetched successfully', mappedData);
  }

  async findOne(id: string) {
    const data = await this.prisma.marketplaceTag.findUnique({
      where: { id },
    });

    if (!data) {
      throw new NotFoundException('Website marketplace tag not found');
    }

    return sendResponse('Website marketplace tag fetched successfully', {
      ...data,
      tag: data.slug,
    });
  }

  async update(id: string, payload: CreateWebsiteMargetPlaceTagDto) {
    const tag = payload.tag.trim();

    const marketplaceTag = await this.prisma.marketplaceTag.findUnique({
      where: { id },
    });

    if (!marketplaceTag) {
      throw new NotFoundException('Website marketplace tag not found');
    }

    const isAlreadyExist = await this.prisma.marketplaceTag.findFirst({
      where: {
        slug: tag,
        id: {
          not: id,
        },
      },
      select: { id: true },
    });

    if (isAlreadyExist) {
      throw new ConflictException('Website marketplace tag already exists');
    }

    try {
      const data = await this.prisma.marketplaceTag.update({
        where: { id },
        data: {
          slug: tag,
          name: tag,
        },
      });

      return sendResponse('Website marketplace tag updated successfully', data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Website marketplace tag already exists');
      }

      throw error;
    }
  }

  async remove(id: string) {
    const marketplaceTag = await this.prisma.marketplaceTag.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!marketplaceTag) {
      throw new NotFoundException('Website marketplace tag not found');
    }

    // Check if the tag is used by any active website via join table
    const isUsed = await this.prisma.websiteMarketplaceTag.findFirst({
      where: {
        tagId: id,
      },
      select: { id: true },
    });

    if (isUsed) {
      throw new ConflictException(
        'Cannot delete marketplace tag as it is currently in use by one or more websites',
      );
    }

    await this.prisma.marketplaceTag.delete({
      where: { id },
    });

    return sendResponse('Website marketplace tag deleted successfully');
  }
}
