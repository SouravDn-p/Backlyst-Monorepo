import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PublisherService } from './publisher.service';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { CreatePublisherProfile } from './dto/create-publisher.dto';
import { ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { UpdatePublisherProfile } from './dto/update-publisher.dto';

@Controller('publisher')
export class PublisherController {
  constructor(private readonly publisherService: PublisherService) {}

  @Post()
  @UserGuard()
  @ApiOperation({
    summary: 'Create publisher profile',
    description:
      'Creates a publisher profile for the authenticated user. Each user can only create one publisher profile.',
  })
  async createPublisherProfile(
    @CurrentUser('id') userId: string,
    @Body() payload: CreatePublisherProfile,
  ) {
    return this.publisherService.createPublisherProfile(userId, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all publishers',
    description:
      'Retrieves a paginated list of publishers with optional search filtering.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search publishers by niche specialization, bio, tags, user name, or email.',
    example: 'nature',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination.',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of publishers to return per page.',
    example: 10,
  })
  async getAllPublishers(
    @Query('search') search?: string,

    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page = 1,

    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit = 10,
  ) {
    return this.publisherService.getAllPublishers(search, page, limit);
  }

  @Get(':userId')
  @ApiParam({
    name: 'userId',
    description: 'Unique identifier of the user who owns the publisher profile',
    example: 'b7c9c7d2-2d6d-4d3f-9c63-1c5c9d4a8e21',
  })
  @ApiOperation({
    summary: 'Get publisher profile',
    description:
      'Retrieves the publisher profile and public publisher statistics for the specified user ID.',
  })
  async getPublisherProfile(@Param('userId') userId: string) {
    return this.publisherService.getPublisherProfile(userId);
  }

  @Patch()
  @UserGuard()
  @ApiOperation({
    summary: 'Update publisher profile',
    description:
      'Updates the authenticated user publisher profile information.',
  })
  async updatePublisherProfile(
    @CurrentUser('id') userId: string,
    @Body() payload: UpdatePublisherProfile,
  ) {
    return this.publisherService.updatePublisherProfile(userId, payload);
  }
}
