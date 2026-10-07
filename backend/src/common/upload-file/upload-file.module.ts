import { Global, Module } from '@nestjs/common';
import { UploadFileService } from './upload-file.service';
import { AwsS3Service } from './aws-s3.service';
// import { S3UploadService } from './s3-upload.service';
// import { UploadFileController } from './upload-file.controller';

@Global()
@Module({
  providers: [UploadFileService, AwsS3Service],
  exports: [AwsS3Service],
  controllers: [],
})
export class UploadFileModule {}
