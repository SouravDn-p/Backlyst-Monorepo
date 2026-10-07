// blog.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBlogPostDto } from './dto/create-blog.dto';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';

@Injectable()
export class BlogService {
  constructor(
    private prisma: PrismaService,
    private readonly s3: AwsS3Service,
  ) {}

  private async mapBlogMediaUrls<
    T extends { thumbnail?: string | null; blocks: unknown },
  >(post: T): Promise<T> {
    const blocks = Array.isArray(post.blocks) ? post.blocks : [];
    const mappedBlocks = await Promise.all(
      blocks.map(async (block) => {
        if (!block || typeof block !== 'object' || !('url' in block)) {
          return block;
        }

        const mediaBlock = block as Record<string, unknown>;
        const url =
          typeof mediaBlock.url === 'string'
            ? await this.s3.resolveFileUrl(mediaBlock.url)
            : null;

        return {
          ...mediaBlock,
          ...(url ? { url } : {}),
        };
      }),
    );

    return {
      ...post,
      thumbnail: await this.s3.resolveFileUrl(post.thumbnail),
      blocks: mappedBlocks,
    };
  }

  async createBlogPost(adminId: string, dto: CreateBlogPostDto) {
    if (!dto.blocks?.length) {
      throw new BadRequestException('At least one field is required');
    }

    let finalAdminId = adminId;
    if (adminId === 'bypass-auth') {
      const admin = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });
      if (!admin)
        throw new BadRequestException(
          'No admin user found in database to assign as author',
        );
      finalAdminId = admin.id;
    }

    const blocks = [...dto.blocks]
      .sort((a, b) => a.order - b.order)
      .map((b, i) => ({ ...b, order: i }));

    const post = await this.prisma.blogPost.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        thumbnail: dto.thumbnail,
        tags: dto.tags ?? [],
        category: dto.category,
        blocks: blocks as any,
        authorId: finalAdminId,
      },
    });

    const mappedPost = await this.mapBlogMediaUrls(post);

    return {
      success: true,
      statusCode: 201,
      message: 'Blog post created successfully',
      data: mappedPost,
    };
  }
  // ---- LIST (public, published only) ----
  async findPublished(page = 1, limit = 10) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.blogPost.count(),
    ]);

    const mappedItems = await Promise.all(
      items.map((item) => this.mapBlogMediaUrls(item)),
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Blog posts fetched successfully',
      data: mappedItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---- SINGLE POST by id (public) ----
  async findById(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const mappedPost = await this.mapBlogMediaUrls(post);

    return {
      success: true,
      statusCode: 200,
      message: 'Blog post fetched successfully',
      data: mappedPost,
    };
  }

  // ---- LIST (admin dashboard, all statuses) ----
  async findAllForAdmin(page = 1, limit = 10) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.blogPost.count(),
    ]);

    const mappedItems = await Promise.all(
      items.map((item) => this.mapBlogMediaUrls(item)),
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Blog posts fetched successfully',
      data: mappedItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---- SINGLE POST by id (admin, status jai hok dekhbe) ----
  async findByIdForAdmin(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const mappedPost = await this.mapBlogMediaUrls(post);

    return {
      success: true,
      statusCode: 200,
      message: 'Blog post fetched successfully',
      data: mappedPost,
    };
  }

  // ---- UPDATE MARKDOWN POST (admin) ----
  async updateMarkdownBlog(id: string, dto: any) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog post not found');
    }

    const dataToUpdate: any = {};
    if (dto.title !== undefined) dataToUpdate.title = dto.title;
    if (dto.subtitle !== undefined) dataToUpdate.subtitle = dto.subtitle;
    if (dto.thumbnail !== undefined) dataToUpdate.thumbnail = dto.thumbnail;
    if (dto.category !== undefined) dataToUpdate.category = dto.category;
    if (dto.tags !== undefined) dataToUpdate.tags = dto.tags ?? [];

    // Rebuild blocks if content or shortDescription is provided
    if (dto.content !== undefined || dto.shortDescription !== undefined) {
      // We will completely replace the blocks array for markdown updates
      const blocks: any[] = [];
      let currentOrder = 0;

      if (
        dto.shortDescription ||
        (existing.blocks as any[])?.find((b: any) => b.type === 'DESCRIPTION')
      ) {
        blocks.push({
          type: 'DESCRIPTION',
          content:
            dto.shortDescription ||
            (existing.blocks as any[])?.find(
              (b: any) => b.type === 'DESCRIPTION',
            )?.content ||
            '',
          order: currentOrder++,
        });
      }

      if (dto.content) {
        blocks.push({
          type: 'MARKDOWN',
          content: dto.content,
          order: currentOrder,
        });
      } else {
        // preserve old markdown
        const oldMd = (existing.blocks as any[])?.find(
          (b: any) => b.type === 'MARKDOWN',
        );
        if (oldMd) {
          oldMd.order = currentOrder;
          blocks.push(oldMd);
        }
      }

      dataToUpdate.blocks = blocks;
    }

    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: dataToUpdate,
    });

    const mappedUpdated = await this.mapBlogMediaUrls(updated);

    return {
      success: true,
      statusCode: 200,
      message: 'Blog post updated successfully',
      data: mappedUpdated,
    };
  }

  // ---- DELETE POST (admin) ----
  async deleteBlog(id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog post not found');
    }

    await this.prisma.blogPost.delete({ where: { id } });

    return {
      success: true,
      statusCode: 200,
      message: 'Blog post deleted successfully',
      data: null,
    };
  }
}
