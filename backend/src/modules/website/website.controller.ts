import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  UserRole,
  AdminAuthorizationSection,
  WebsiteVerificationStatus,
  WebsiteVerificationType,
} from '@prisma/client';
import { Request } from 'express';
import { CreateWebsiteDto } from './dto/create-website.dto';
import { UpdateWebsiteDto } from './dto/update-website.dto';
import { WebsiteService } from './website.service';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorator/require-permission.decorator';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    role: UserRole;
  };
};

@Controller('website')
@UserGuard()
@ApiBearerAuth(ACCESS_TOKEN)
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Post()
  @ApiOperation({
    summary: 'Create website',
    description:
      'Allows an authenticated user to register a new website. This endpoint stores the website URL along with metadata required for later verification.',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createWebsiteDto: CreateWebsiteDto,
  ) {
    return this.websiteService.create(req.user.id, createWebsiteDto);
  }

  @Get()
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'read')
  @ApiOperation({
    summary: 'Get all websites',
    description:
      'Retrieves a paginated list of all websites. Supports filtering by verification status, verification type, and author.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'verificationStatus',
    required: false,
    enum: WebsiteVerificationStatus,
    description:
      'Filter by website main verification status, for example VERIFIED, PENDING, VERIFICATION_FAILED, or REJECTED',
  })
  @ApiQuery({
    name: 'verificationType',
    required: false,
    enum: WebsiteVerificationType,
    description: 'Filter by verification method type',
  })
  @ApiQuery({
    name: 'verificationRequestStatus',
    required: false,
    enum: WebsiteVerificationStatus,
    description:
      'Filter by verification request status, for example REQUESTED_FOR_MANUAL_REVIEW or VERIFICATION_FAILED',
  })
  @ApiQuery({
    name: 'authorId',
    required: false,
    type: String,
    example: 'user_123',
    description: 'Filter by website author ID',
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('verificationStatus')
    verificationStatus?: WebsiteVerificationStatus,
    @Query('verificationType')
    verificationType?: WebsiteVerificationType,
    @Query('verificationRequestStatus')
    verificationRequestStatus?: WebsiteVerificationStatus,
    @Query('authorId') authorId?: string,
  ) {
    return this.websiteService.findAll(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      verificationStatus,
      verificationType,
      authorId,
      verificationRequestStatus,
    );
  }

  @Get('my-websites')
  @ApiOperation({
    summary: 'Get my websites',
    description:
      'Retrieves a paginated list of websites created by the authenticated user. Supports optional filtering by verification status.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'verificationStatus',
    required: false,
    enum: WebsiteVerificationStatus,
    description:
      'Filter by website main verification status, for example VERIFIED, PENDING, VERIFICATION_FAILED, or REJECTED',
  })
  @ApiQuery({
    name: 'verificationRequestStatus',
    required: false,
    enum: WebsiteVerificationStatus,
    description:
      'Filter by verification request status, for example REQUESTED_FOR_MANUAL_REVIEW or VERIFICATION_FAILED',
  })
  findMyWebsites(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('verificationStatus')
    verificationStatus?: WebsiteVerificationStatus,
    @Query('verificationRequestStatus')
    verificationRequestStatus?: WebsiteVerificationStatus,
  ) {
    return this.websiteService.findMyWebsites(
      req.user.id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      verificationStatus,
      verificationRequestStatus,
    );
  }

  @Patch(':id/lock')
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'update')
  @ApiOperation({
    summary: 'Lock or unlock website wallet',
    description:
      'Admin only: toggles website wallet lock. If locked, it becomes unlocked; if unlocked, it becomes locked.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Website ID',
    example: 'website_123',
  })
  lockWebsite(@Param('id') id: string) {
    return this.websiteService.lockWebsite(id);
  }

  @Patch(':id/flag')
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'update')
  @ApiOperation({
    summary: 'Flag or unflag website',
    description:
      'Admin only: toggles website flag. If flagged, it becomes unflagged; if unflagged, it becomes flagged.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Website ID',
    example: 'website_123',
  })
  flagWebsite(@Param('id') id: string) {
    return this.websiteService.flagWebsite(id);
  }

  @Get(':id/trust')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get website trust indicators',
    description:
      "Returns the trust metrics from the website's matching profile (completed/successful/failed interactions, completionRate, reliabilityScore, avgQualityRating, reputationScore). Restricted to the website owner or an admin. Returns 404 if no matching profile exists.",
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unique identifier of the website',
    example: 'website_123',
  })
  getTrust(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.websiteService.getTrustMetrics(id, userId, role);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get website by ID',
    description:
      'Retrieves a single website by its ID. Access may vary based on user role and ownership.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unique identifier of the website',
    example: 'website_123',
  })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.websiteService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update website',
    description:
      'Updates an existing website. Only the owner or authorized admin can perform this action.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unique identifier of the website to update',
    example: 'website_123',
  })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateWebsiteDto: UpdateWebsiteDto,
  ) {
    return this.websiteService.update(id, userId, updateWebsiteDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete website',
    description:
      'Deletes a website by ID. Access is restricted based on ownership or admin role.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unique identifier of the website to delete',
    example: 'website_123',
  })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.websiteService.remove(id, req.user.id, req.user.role);
  }
}
