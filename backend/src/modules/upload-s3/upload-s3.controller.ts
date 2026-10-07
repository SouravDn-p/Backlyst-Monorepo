import { Body, Controller, Delete, Get, Post, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadS3Service } from './upload-s3.service';
import { PresignUploadDto } from './dto/presign-upload.dto';

@ApiTags('Upload S3')
@Controller('upload-s3')
export class UploadS3Controller {
  constructor(private readonly uploadS3Service: UploadS3Service) {}

  @Post('presign')
  @ApiOperation({
    summary: 'Create a presigned S3 upload URL',
    description:
      'Returns a short-lived S3 upload URL plus the generated object key so the client can upload directly to the bucket.',
    security: [],
  })
  async presignUpload(@Body() payload: PresignUploadDto) {
    return this.uploadS3Service.presignUpload(payload);
  }

  @Post('direct')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload to S3.',
        },
        folder: {
          type: 'string',
          default: 'blog-image',
          example: 'messaging',
          enum: [
            'auth',
            'user',
            'messaging',
            'website-verification',
            'website',
            'website-logo',
            'task-support',
            'task-proof',
            'blog-image',
            'blog-video',
            'blog-thumbnail',
          ],
          description:
            'Optional S3 folder. Use "messaging" for chat image, audio, PDF, or document attachments.',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Directly upload a file to S3 via backend',
    description:
      'Uploads a multipart file through the backend and stores it in S3. For messaging attachments, send folder=messaging and pass the returned key as documentKey to POST /messaging/send.',
    security: [],
  })
  async uploadDirectly(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    return this.uploadS3Service.uploadDirectly(file, folder || 'blog-image');
  }

  @Get('download')
  @ApiOperation({
    summary: 'Get signed download URL for an S3 object key',
    description: 'Generates a signed URL to retrieve a file from S3/MinIO.',
    security: [],
  })
  @ApiQuery({ name: 'key', required: true, description: 'S3 object key or URL' })
  @ApiQuery({ name: 'expiresIn', required: false, type: Number, description: 'Expiry in seconds' })
  async getDownloadUrl(
    @Query('key') key: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    const expiry = expiresIn ? parseInt(expiresIn, 10) : undefined;
    return this.uploadS3Service.getDownloadUrl(key, expiry);
  }

  @Delete('file')
  @ApiOperation({
    summary: 'Delete a file from S3',
    description: 'Deletes an object from the S3 bucket using its key.',
    security: [],
  })
  @ApiQuery({ name: 'key', required: true, description: 'S3 object key or URL' })
  async deleteFile(@Query('key') key: string) {
    await this.uploadS3Service.deleteFile(key);
    return { success: true, message: 'File deleted successfully', key };
  }
}
