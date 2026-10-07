import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  UploadedFile,
  Post,
  Query,
} from '@nestjs/common';
import { WebsiteVerificationService } from './website-verification.service';
import { VerifyWebsiteByScreenshotDto } from './dto/website-verification.dto';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import {
  WebsiteVerificationStatus,
  WebsiteVerificationType,
} from '@prisma/client';
import { Public } from 'src/common/decorator/public.decorator';
import { WebsiteVerificationMetaService } from './website-verification-meta.service';
import { WebsiteVerificationDnsService } from './website-verification-dns.service';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import {
  AllowedFileType,
  UploadSingleFile,
} from 'src/common/decorator/upload-file.decorator';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';

@ApiTags('Website Verification')
@Controller('website-verification')
@UserGuard()
@ApiBearerAuth(ACCESS_TOKEN)
export class WebsiteVerificationController {
  constructor(
    private readonly websiteVerificationService: WebsiteVerificationService,
    private readonly metaVerification: WebsiteVerificationMetaService,
    private readonly dnsVerification: WebsiteVerificationDnsService,
    private readonly s3: AwsS3Service,
  ) {}

  @Post('screenshot/request')
  @UploadSingleFile('file', AllowedFileType.IMAGE)
  @ApiOperation({
    summary: 'Request website verification via screenshot',
    description:
      'Upload a screenshot showing ownership of the website. The screenshot will be stored in S3 and reviewed manually by admin.',
  })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['websiteId', 'file'],
      properties: {
        websiteId: {
          type: 'string',
          example: 'c1f7b9c2-1234-4abc-9f12-abcdef123456',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Website ownership verification screenshot image.',
        },
      },
    },
  })
  async requestScreenshotVerification(
    @Body() payload: VerifyWebsiteByScreenshotDto,
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const uploadedScreenshot = await this.s3.uploadFileToS3(
      file,
      'website-verification',
    );
    const requestPayload = {
      ...payload,
      screenshotImageKey: uploadedScreenshot.downloadUrl,
    };

    return this.websiteVerificationService.requestScreenshotVerification(
      userId,
      requestPayload,
    );
  }

  @Get('details/:id')
  @ApiOperation({
    summary: 'Get verification request details by ID',
    description:
      'Get details of a specific website verification request by its unique ID.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unique ID of the website verification request',
    example: 'c1f7b9c2-1234-4abc-9f12-abcdef123456',
  })
  async seeWebsiteVerificationRequest(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.websiteVerificationService.seeVerificationDetails(id, userId);
  }

  @Get('my-requests')
  @ApiOperation({
    summary: 'Get my website verification requests',
    description:
      'Get a list of website verification requests made by the authenticated user with optional filters, search, and pagination.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
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
  async getMyVerificationRequests(
    @CurrentUser('id') userId: string,

    @Query('search') search?: string,

    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,

    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,

    @Query('type') type?: WebsiteVerificationType,

    @Query('status') status?: WebsiteVerificationStatus,
  ) {
    return this.websiteVerificationService.getMyVerificationRequests(
      userId,
      search,
      page,
      limit,
      {
        type,
        status,
      },
    );
  }

  @Get('meta-tags')
  @Public()
  @ApiOperation({
    summary: 'Get website verification meta tags',
    description:
      'Returns meta tag and DNS TXT verification formats used for website ownership verification.',
  })
  async getMetaTags() {
    return this.websiteVerificationService.getMetaTags();
  }

  @Post('meta-tag/request/:websiteId')
  @ApiOperation({
    summary: 'Request website verification via meta tag',
    description:
      'Request a website verification via meta tag. This process is an automated process.',
  })
  @ApiParam({
    name: 'websiteId',
    type: String,
    description: 'Unique ID of the website',
    example: 'c1f7b9c2-1234-4abc-9f12-abcdef123456',
  })
  async requestMetaTagVerification(
    @CurrentUser('id') userId: string,
    @Param('websiteId') websiteId: string,
  ) {
    return this.metaVerification.requestForMetaTagVerification(
      websiteId,
      userId,
    );
  }

  @Post('dns/request/:websiteId')
  @ApiOperation({
    summary: 'Request website verification via DNS TXT record',
    description:
      'Initiates an automated DNS TXT record verification process for the specified website.',
  })
  @ApiParam({
    name: 'websiteId',
    type: String,
    description: 'Unique ID of the website',
    example: 'c1f7b9c2-1234-4abc-9f12-abcdef123456',
  })
  async requestDnsVerification(
    @CurrentUser('id') userId: string,
    @Param('websiteId') websiteId: string,
  ) {
    return this.dnsVerification.requestForDnsVerification(websiteId, userId);
  }

  @Post('manual-review/request/:websiteId')
  @ApiOperation({
    summary: 'Request manual review after failed website verification',
    description:
      'Allows a user to request manual admin review after HTML meta tag or DNS TXT verification fails.',
  })
  @ApiParam({
    name: 'websiteId',
    type: String,
    description: 'Unique ID of the website',
    example: 'c1f7b9c2-1234-4abc-9f12-abcdef123456',
  })
  async requestManualReview(
    @CurrentUser('id') userId: string,
    @Param('websiteId') websiteId: string,
  ) {
    return this.websiteVerificationService.requestManualReview(
      userId,
      websiteId,
    );
  }
}

