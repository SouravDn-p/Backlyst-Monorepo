import { Injectable } from '@nestjs/common';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { PresignUploadDto } from './dto/presign-upload.dto';

@Injectable()
export class UploadS3Service {
  constructor(private readonly s3: AwsS3Service) {}

  async presignUpload(payload: PresignUploadDto) {
    return this.s3.createPresignedUploadUrl(
      payload.fileName,
      payload.contentType,
      {
        folder: payload.folder,
        expiresIn: payload.expiresIn,
      },
    );
  }

  async uploadDirectly(file: Express.Multer.File, folder: string = 'blog-image') {
    return this.s3.uploadFileToS3(file, folder);
  }

  async getDownloadUrl(key: string, expiresIn?: number) {
    return this.s3.getDownloadUrl(key, { expiresIn });
  }

  async deleteFile(key: string) {
    return this.s3.deleteFileFromS3(key);
  }
}
