// blog.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
// Removed Express import to fix TS1272 error with emitDecoratorMetadata
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog.dto';
import { CreateBlogPostMultipartDto } from './dto/create-blog-multipart.dto';
import { CreateMarkdownBlogDto } from './dto/create-markdown-blog.dto';
import { UpdateMarkdownBlogDto } from './dto/update-markdown-blog.dto';
import { BlockType } from './dto/block.dto';
import {
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AwsS3Service } from '../../common/upload-file/aws-s3.service';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { RequirePermission } from 'src/common/decorator/require-permission.decorator';
import { AdminAuthorizationSection } from '@prisma/client';

@Controller('blog')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  // ---- Admin: list all statuses ----
  @ApiBearerAuth()
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.BLOG, 'read')
  @ApiOperation({ summary: 'Get all blog posts (admin, all statuses)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('admin/all')
  findAllAdmin(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.blogService.findAllForAdmin(+page, +limit);
  }

  // ---- Admin: single post regardless of status ----
  @ApiBearerAuth()
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.BLOG, 'read')
  @ApiOperation({ summary: 'Get a single blog post by id (admin, any status)' })
  @ApiParam({ name: 'id', example: 'c023e360-a9e8-4458-a3d5-190d47fceaca' })
  @Get('admin/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.blogService.findByIdForAdmin(id);
  }

  // ---- Admin: update markdown post ----
  @ApiBearerAuth(ACCESS_TOKEN)
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.BLOG, 'update')
  @Patch('admin/markdown/:id')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateMarkdownBlogDto })
  async updateMarkdown(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const dto: any = { ...body };
    if (dto.tags && typeof dto.tags === 'string') {
      dto.tags = dto.tags.split(',').map((t: string) => t.trim());
    }

    if (file) {
      const uploaded = await this.awsS3Service.uploadFileToS3(
        file,
        'blog-image',
      );
      dto.thumbnail = uploaded.key;
    }

    return this.blogService.updateMarkdownBlog(id, dto);
  }

  // ---- Admin: delete post ----
  @ApiBearerAuth(ACCESS_TOKEN)
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.BLOG, 'delete')
  @Delete('admin/:id')
  @ApiOperation({ summary: 'Delete a blog post (admin)' })
  deleteBlog(@Param('id') id: string) {
    return this.blogService.deleteBlog(id);
  }

  // ---- Public: list ----
  @ApiOperation({ summary: 'Get all published blog posts' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get()
  findPublished(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.blogService.findPublished(+page, +limit);
  }

  // ---- Public: single post ----
  @ApiOperation({ summary: 'Get a single published blog post by id' })
  @ApiParam({ name: 'id', example: 'c023e360-a9e8-4458-a3d5-190d47fceaca' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogService.findById(id);
  }

  // ---- Create ----
  @ApiBearerAuth(ACCESS_TOKEN)
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.BLOG, 'create')
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateBlogPostMultipartDto })
  async create(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const dto = new CreateBlogPostDto();
    dto.title = body.title || '';
    dto.subtitle = body.subtitle || '';
    dto.category = body.category;
    dto.tags = body.tags ? body.tags.split(',').map((t) => t.trim()) : [];
    dto.blocks = [];

    // Helper to safely parse JSON style strings
    const parseStyle = (styleStr: string) => {
      if (!styleStr) return undefined;
      try {
        return JSON.parse(styleStr);
      } catch {
        return undefined;
      }
    };

    // Prepare a map of all available fixed blocks from the body
    const blocksMap: Record<string, any> = {};

    if (body.title)
      blocksMap.title = {
        type: BlockType.TITLE,
        content: body.title,
        style: parseStyle(body.titleStyle),
      };
    if (body.subtitle)
      blocksMap.subtitle = {
        type: BlockType.SUBTITLE,
        content: body.subtitle,
        style: parseStyle(body.subtitleStyle),
      };
    if (body.sectionTitle)
      blocksMap.sectionTitle = {
        type: BlockType.SECTION_TITLE,
        content: body.sectionTitle,
        style: parseStyle(body.sectionTitleStyle),
      };
    if (body.sectionSubtitle)
      blocksMap.sectionSubtitle = {
        type: BlockType.SECTION_SUBTITLE,
        content: body.sectionSubtitle,
        style: parseStyle(body.sectionSubtitleStyle),
      };
    if (body.description)
      blocksMap.description = {
        type: BlockType.DESCRIPTION,
        content: body.description,
        style: parseStyle(body.descriptionStyle),
      };

    // For video and image, we will set URLs after uploading files
    if (
      body.videoFrameSize !== undefined ||
      files?.find((f) => f.fieldname === 'video')
    ) {
      blocksMap.video = {
        type: BlockType.VIDEO,
        frameSize: body.videoFrameSize,
      };
    }
    if (
      body.imageFrameSize !== undefined ||
      files?.find((f) => f.fieldname === 'image')
    ) {
      blocksMap.image = {
        type: BlockType.IMAGE,
        frameSize: body.imageFrameSize,
      };
    }

    // Process extra dynamically added blocks
    let extraBlocks: any[] = [];
    if (
      typeof body.extraBlocks === 'string' &&
      body.extraBlocks.trim() !== ''
    ) {
      try {
        extraBlocks = JSON.parse(body.extraBlocks);
        if (!Array.isArray(extraBlocks)) {
          throw new Error('Not an array');
        }
      } catch (e) {
        throw new BadRequestException(
          'Invalid JSON array in "extraBlocks" field',
        );
      }
    }

    extraBlocks.forEach((block: any, index: number) => {
      blocksMap[`extra_${index}`] = block;
    });

    // Determine the final order
    let finalOrder: string[] = [];
    if (typeof body.order === 'string' && body.order.trim() !== '') {
      try {
        finalOrder = JSON.parse(body.order);
        if (!Array.isArray(finalOrder)) {
          throw new Error('Not an array');
        }
      } catch (e) {
        throw new BadRequestException('Invalid JSON array in "order" field');
      }
    } else {
      // Default order if none provided
      finalOrder = Object.keys(blocksMap);
    }

    // Build the final blocks array
    finalOrder.forEach((key) => {
      if (blocksMap[key]) {
        dto.blocks.push(blocksMap[key]);
      }
    });

    // Upload files and assign URLs
    if (files && files.length > 0) {
      for (const file of files) {
        const uploaded = await this.awsS3Service.uploadFileToS3(file, 'blog');

        if (file.fieldname === 'video' && blocksMap.video) {
          blocksMap.video.url = uploaded.key;
        } else if (file.fieldname === 'image' && blocksMap.image) {
          blocksMap.image.url = uploaded.key;
        } else if (
          file.fieldname.startsWith('extra_') &&
          file.fieldname.endsWith('_file')
        ) {
          // Fieldname like extra_0_file
          const parts = file.fieldname.split('_');
          const index = parseInt(parts[1], 10);
          if (!isNaN(index) && blocksMap[`extra_${index}`]) {
            blocksMap[`extra_${index}`].url = uploaded.key;
          }
        } else if (file.fieldname === 'thumbnail') {
          dto.thumbnail = uploaded.key;
        }
      }
    }

    return this.blogService.createBlogPost('bypass-auth', dto);
  }

  // ---- Create Markdown Blog ----
  @ApiBearerAuth(ACCESS_TOKEN)
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.BLOG, 'create')
  @Post('markdown')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateMarkdownBlogDto })
  async createMarkdown(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!body.title || !body.content) {
      throw new BadRequestException('title and content are required');
    }

    const dto = new CreateBlogPostDto();
    dto.title = body.title;
    dto.subtitle = body.subtitle || '';
    dto.category = body.category;
    dto.tags = body.tags
      ? body.tags.split(',').map((t: string) => t.trim())
      : [];

    dto.blocks = [];
    let currentOrder = 0;

    if (body.shortDescription) {
      dto.blocks.push({
        type: BlockType.DESCRIPTION,
        content: body.shortDescription,
        order: currentOrder++,
      });
    }

    dto.blocks.push({
      type: BlockType.MARKDOWN,
      content: body.content,
      order: currentOrder,
    });

    if (file) {
      const uploaded = await this.awsS3Service.uploadFileToS3(file, 'blog');
      dto.thumbnail = uploaded.key;
    }

    return this.blogService.createBlogPost('bypass-auth', dto);
  }
}
