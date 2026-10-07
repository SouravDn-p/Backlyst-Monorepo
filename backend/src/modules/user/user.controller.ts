import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UploadedFile,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { UpdateWebsiteDefaultsDto } from './dto/update-website-defaults.dto';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UserBusinessTypeEnum } from 'src/common/enum';
import {
  AllowedFileType,
  UploadSingleFile,
} from 'src/common/decorator/upload-file.decorator';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';

@UserGuard()
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly s3: AwsS3Service,
  ) {}

  @Patch('update-profile')
  @UploadSingleFile('image', AllowedFileType.IMAGE)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update your profile',
    description:
      'Updates your profile information, such as name, phone, company, optional password replacement, and optional profile image upload.',
  })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 2,
          maxLength: 100,
          example: 'John Doe',
        },
        phoneNumber: {
          type: 'string',
          minLength: 2,
          maxLength: 30,
          example: '+8801712345678',
        },
        country: {
          type: 'string',
          minLength: 2,
          maxLength: 100,
          example: 'Bangladesh',
        },
        companyName: {
          type: 'string',
          minLength: 2,
          maxLength: 150,
          example: 'Acme Inc.',
        },
        companyWebsite: {
          type: 'string',
          example: 'https://acme.com',
        },
        companyIndustry: {
          type: 'string',
          example: 'Technology',
        },
        businessType: {
          type: 'string',
          enum: Object.values(UserBusinessTypeEnum),
          example: UserBusinessTypeEnum.SOLE_PROPRIETORSHIP,
        },
        vatUid: {
          type: 'string',
          minLength: 2,
          maxLength: 50,
          example: 'VAT-123456789',
        },
        newPassword: {
          type: 'string',
          minLength: 6,
          maxLength: 100,
          example: 'NewSecurePassword123!',
        },
        imageKey: {
          type: 'string',
          example: 'user/1719980000000-avatar.png',
          description:
            'Optional S3 object key returned by the presigned upload flow. If an image file is uploaded in this request, that file takes priority.',
        },
        image: {
          type: 'string',
          format: 'binary',
          description:
            'Optional profile image file. If sent, the backend uploads it to S3 and uses the generated image key automatically.',
        },
      },
    },
  })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() data: UpdateUserDto = {},
    @UploadedFile() image?: Express.Multer.File,
  ) {
    let payload = { ...data };

    if (image) {
      const uploadedImage = await this.s3.uploadFileToS3(image, 'user');
      payload = {
        ...payload,
        imageKey: uploadedImage.key,
      };
    }

    return this.userService.updateProfile(userId, payload);
  }

  @Patch('update-notification-preferences')
  @ApiOperation({
    summary: 'Update your notification preferences',
    description: 'Updates only your notification preference toggles.',
  })
  updateNotificationPreferences(
    @CurrentUser('id') userId: string,
    @Body() data: UpdateNotificationPreferencesDto,
  ) {
    return this.userService.updateNotificationPreferences(userId, data);
  }

  @Patch('update-task-defaults')
  @ApiOperation({
    summary: 'Update your task defaults',
    description:
      'Updates task default toggles. These fields work as a toggle pair, so you can send either one. If one is turned on, the other is turned off automatically.',
  })
  @ApiBody({
    required: true,
    description:
      'Send any one of these fields. They work as a toggle pair, so if one is set to true, the other will be turned off automatically.',
    schema: {
      type: 'object',
      properties: {
        taskAutoAcceptTasks: {
          type: 'boolean',
          example: true,
          description: 'Send this field or send taskManualReviewRequired.',
        },
        taskManualReviewRequired: {
          type: 'boolean',
          example: false,
          description: 'Send this field or send taskAutoAcceptTasks.',
        },
      },
    },
  })
  updateTaskDefaults(
    @CurrentUser('id') userId: string,
    @Body() data: UpdateWebsiteDefaultsDto,
  ) {
    return this.userService.updateWebsiteDefaults(userId, data);
  }

  @Get('export-data')
  @ApiOperation({
    summary: 'Export my user data',
    description:
      'Exports authenticated user data including profile, sessions, websites, credits, subscriptions, referrals, tasks, and legal acceptances.',
  })
  exportMyData(@CurrentUser('id') userId: string) {
    return this.userService.exportMyData(userId);
  }

  @Delete('delete-myself-account')
  @ApiOperation({
    summary: 'Delete your account',
    description: 'Deletes your account from the system.',
  })
  deleteMyselfAccount(@CurrentUser('id') id: string) {
    return this.userService.deleteMyselfAccount(id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single user by ID',
    description: 'Retrieves a user by their unique identifier.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Unique identifier of the user to retrieve',
  })
  async getSingleUser(@Param('id') userId: string) {
    return this.userService.findSingleUser(userId);
  }
}
