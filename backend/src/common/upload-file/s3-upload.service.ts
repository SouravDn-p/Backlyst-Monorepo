// import {
//   GetObjectCommand,
//   PutObjectCommand,
//   S3Client,
// } from '@aws-sdk/client-s3';
// import {
//   BadRequestException,
//   Injectable,
//   InternalServerErrorException,
//   Logger,
// } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { randomUUID } from 'node:crypto';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// import { UploadFileDto } from './dto/upload-file.dto';

// export type S3UploadOptions = {
//   folder?: string;
//   expiresIn?: number;
// };

// @Injectable()
// export class S3UploadService {
//   private readonly logger = new Logger(S3UploadService.name);
//   private readonly bucket: string;
//   private readonly region: string;
//   private readonly s3: S3Client;

//   private static readonly DEFAULT_UPLOAD_EXPIRY = 3600; // 1 hour
//   private static readonly DEFAULT_DOWNLOAD_EXPIRY = 60 * 60 * 24; // 1 day

//   constructor(private readonly config: ConfigService) {
//     this.bucket = this.config.getOrThrow('AWS_S3_BUCKET');
//     this.region = this.config.getOrThrow('AWS_REGION');

//     this.s3 = new S3Client({
//       region: this.region,
//       credentials: {
//         accessKeyId: this.config.getOrThrow('AWS_ACCESS_KEY_ID'),
//         secretAccessKey: this.config.getOrThrow('AWS_SECRET_ACCESS_KEY'),
//       },
//     });
//   }

//   private sanitizeFileName(fileName: string): string {
//     return fileName
//       .trim()
//       .replace(/[^a-zA-Z0-9._-]/g, '-')
//       .replace(/-+/g, '-')
//       .slice(0, 100);
//   }

//   private sanitizeFolder(folder: string): string {
//     return (
//       folder
//         .replace(/[^a-zA-Z0-9/_-]/g, '')
//         .replace(/^\/+/, '')
//         .replace(/\/+/g, '/')
//         .replace(/\/$/, '') || 'uploads'
//     );
//   }

//   private generateKey(fileName: string, folder = 'uploads'): string {
//     const safeFolder = this.sanitizeFolder(folder);

//     const safeName = this.sanitizeFileName(fileName);

//     return `${safeFolder}/${Date.now()}-${randomUUID()}-${safeName}`;
//   }

//   async createSingleUploadUrl(
//     payload: UploadFileDto,
//     options: S3UploadOptions = {},
//   ): Promise<{ url: string; key: string }> {
//     const {
//       expiresIn = S3UploadService.DEFAULT_UPLOAD_EXPIRY,
//       folder = 'uploads',
//     } = options;

//     const key = this.generateKey(payload.fileName, folder);

//     try {
//       const command = new PutObjectCommand({
//         Bucket: this.bucket,
//         Key: key,
//         ContentType: payload.fileType,
//       });

//       const url = await getSignedUrl(this.s3, command, { expiresIn });

//       return { url, key };
//     } catch (error) {
//       this.logger.error('Failed to generate upload URL', { error, key });
//       throw new InternalServerErrorException('Failed to generate upload URL');
//     }
//   }

//   async getDownloadUrl(
//     key: string,
//     options: { expiresIn?: number } = {},
//   ): Promise<{ key: string; downloadUrl: string }> {
//     if (!key?.trim()) {
//       throw new BadRequestException('key is required');
//     }

//     const { expiresIn = S3UploadService.DEFAULT_DOWNLOAD_EXPIRY } = options;

//     try {
//       const command = new GetObjectCommand({
//         Bucket: this.bucket,
//         Key: key,
//       });

//       const downloadUrl = await getSignedUrl(this.s3, command, {
//         expiresIn,
//       });

//       return { key, downloadUrl };
//     } catch (error) {
//       console.error(
//         `Failed to generate download URL: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
//       );
//       throw new InternalServerErrorException('Failed to generate download URL');
//     }
//   }
// }
