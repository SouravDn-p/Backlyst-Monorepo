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
import { WebsiteVerificationAdminService } from './website-verification-admin.service';
import {
  ApproveWebsiteScreenshotVerificationDto,
  RejectWebsiteScreenshotVerificationDto,
} from './dto/verification-response.dto';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import {
  AdminAuthorizationSection,
  WebsiteVerificationStatus,
  WebsiteVerificationType,
} from '@prisma/client';
import { AddWebsiteVerificationMetaTagDto } from './dto/add-verification-meta-tag.dto';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { RequirePermission } from 'src/common/decorator/require-permission.decorator';

@ApiTags('Website Verification Admin')
@Controller('website-verification-admin')
@ApiBearerAuth(ACCESS_TOKEN)
export class WebsiteVerificationAdminController {
  constructor(
    private readonly websiteVerificationAdminService: WebsiteVerificationAdminService,
  ) {}

  @Patch('screenshot/approve')
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'update')
  @ApiOperation({
    summary: 'Approve website verification request',
    description:
      'Approve a website verification request. Only admin can access this route.',
  })
  async manualApproveWebsiteVerificationRequest(
    @CurrentUser('id') userId: string,
    @Body() payload: ApproveWebsiteScreenshotVerificationDto,
  ) {
    return this.websiteVerificationAdminService.manualApproveWebsiteVerificationRequest(
      userId,
      payload,
    );
  }

  @Patch('screenshot/reject')
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'update')
  @ApiOperation({
    summary: 'Reject website verification request',
    description:
      'Reject a website verification request. Only admin can access this route.',
  })
  async rejectWebsiteVerificationRequest(
    @CurrentUser('id') userId: string,
    @Body() payload: RejectWebsiteScreenshotVerificationDto,
  ) {
    return this.websiteVerificationAdminService.rejectWebsiteVerificationRequest(
      userId,
      payload,
    );
  }

  @Patch('approve')
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'update')
  @ApiOperation({
    summary: 'Approve website verification',
    description:
      'Approve a pending manual website verification request. Only admin can access this route.',
  })
  @ApiBody({
    type: ApproveWebsiteScreenshotVerificationDto,
    examples: {
      approveVerification: {
        summary: 'Approve verification',
        value: {
          websiteId: 'c1f7b9c2-1234-4abc-9f12-abcdef123456',
          manualReviewNotes: 'Verification proof is valid.',
        },
      },
    },
  })
  async approveWebsiteVerification(
    @CurrentUser('id') userId: string,
    @Body() payload: ApproveWebsiteScreenshotVerificationDto,
  ) {
    return this.websiteVerificationAdminService.manualApproveWebsiteVerificationRequest(
      userId,
      payload,
    );
  }

  @Patch('reject')
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'update')
  @ApiOperation({
    summary: 'Reject website verification',
    description:
      'Reject a pending manual website verification request. Only admin can access this route.',
  })
  @ApiBody({
    type: RejectWebsiteScreenshotVerificationDto,
    examples: {
      rejectVerification: {
        summary: 'Reject verification',
        value: {
          websiteId: 'c1f7b9c2-1234-4abc-9f12-abcdef123456',
          rejectionReason: 'Verification proof is invalid or incomplete.',
          manualReviewNotes: 'User needs to submit valid ownership proof.',
        },
      },
    },
  })
  async rejectWebsiteVerification(
    @CurrentUser('id') userId: string,
    @Body() payload: RejectWebsiteScreenshotVerificationDto,
  ) {
    return this.websiteVerificationAdminService.rejectWebsiteVerificationRequest(
      userId,
      payload,
    );
  }

  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'read')
  @Get('pending')
  @ApiOperation({
    summary: 'Get all website verification requests',
    description:
      'Fetch all website verification requests (pending + manual review). Only admin can access this route.',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: WebsiteVerificationType,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WebsiteVerificationStatus,
  })
  async getAllWebsiteVerificationRequests(
    @Query('search') search?: string,

    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page?: number,

    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit?: number,

    @Query('type') type?: WebsiteVerificationType,

    @Query('status') status?: WebsiteVerificationStatus,
  ) {
    return this.websiteVerificationAdminService.getAllWebsiteVerificationRequests(
      search,
      page,
      limit,
      {
        type,
        status,
      },
    );
  }

  @Get('details/:id')
  @ApiOperation({
    summary: 'Get website verification details',
    description:
      'Fetch full website verification details. Only admin can access this route.',
  })
  @ApiParam({
    name: 'id',
    description: 'Website verification ID',
    type: String,
  })
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'read')
  async getWebsiteVerificationDetails(@Param('id') id: string) {
    return this.websiteVerificationAdminService.seeVerificationDetails(id);
  }

  @Post('meta-tag')
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'update')
  @ApiOperation({
    summary: 'Add or update website verification meta tag',
    description:
      'Creates or updates the global website verification meta tag. Only admin can access this route.',
  })
  async addOrUpdateVerificationMetaTag(
    @Body() payload: AddWebsiteVerificationMetaTagDto,
  ) {
    return this.websiteVerificationAdminService.addOrUpdateVerificationMetaTag(
      payload,
    );
  }

  @Get('meta-tag')
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'read')
  @ApiOperation({
    summary: 'Get website verification meta tag',
    description:
      'Fetch the global website verification meta tag. Only admin can access this route.',
  })
  async getVerificationMetaTag() {
    return this.websiteVerificationAdminService.getVerificationMetaTag();
  }

  @Patch('websites/:websiteId/force-reverification')
  @AdminGuard()
  @RequirePermission(AdminAuthorizationSection.WEBSITES, 'update')
  @ApiOperation({
    summary: 'Force website re-verification',
    description:
      'Marks an already verified website as pending so the user must verify ownership again.',
  })
  @ApiParam({
    name: 'websiteId',
    description: 'Website ID',
    type: String,
  })
  async forceWebsiteReverification(@Param('websiteId') websiteId: string) {
    return this.websiteVerificationAdminService.forceWebsiteReverification(
      websiteId,
    );
  }
}
