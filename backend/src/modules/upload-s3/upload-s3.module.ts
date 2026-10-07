import { Module } from '@nestjs/common';
import { UploadFileModule } from 'src/common/upload-file/upload-file.module';
import { UploadS3Service } from './upload-s3.service';
import { UploadS3Controller } from './upload-s3.controller';

@Module({
  imports: [UploadFileModule],
  controllers: [UploadS3Controller],
  providers: [UploadS3Service],
})
export class UploadS3Module {}
