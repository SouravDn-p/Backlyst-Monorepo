import { randomUUID } from 'crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type UploadedS3File = {
  url: string;
  key: string;
  downloadUrl: string;
};

type PresignedUploadOptions = {
  expiresIn?: number;
  folder?: string;
};

@Injectable()
export class AwsS3Service implements OnModuleInit {
  private readonly bucket: string;
  private readonly region: string;
  private readonly s3Client: S3Client;
  private readonly publicS3Client: S3Client;
  private readonly publicEndpoint?: string;
  private readonly signedUrlExpirySeconds: number;
  private static readonly DEFAULT_UPLOAD_EXPIRY = 60 * 15;
  private static readonly DEFAULT_DOWNLOAD_EXPIRY = 60 * 60 * 24;
  private static readonly ALLOWED_UPLOAD_FOLDERS = new Set([
    'auth',
    'user',
    'messaging',
    'website-verification',
    'website',
    'website-logo',
    'task-support',
    'task-proof',
    'blog',
    'blog-image',
    'blog-video',
    'blog-thumbnail',
  ]);

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    this.region = this.configService.getOrThrow<string>('AWS_REGION');
    this.signedUrlExpirySeconds = this.parseExpirySeconds(
      this.configService.get<string>('AWS_S3_SIGNED_URL_EXPIRY'),
      AwsS3Service.DEFAULT_DOWNLOAD_EXPIRY,
    );

    const internalEndpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
    const publicEndpoint = this.configService.get<string>('AWS_S3_PUBLIC_ENDPOINT') || internalEndpoint;
    const forcePathStyle = this.configService.get<string>('AWS_S3_FORCE_PATH_STYLE') === 'true';

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    const hasExplicitCredentials =
      accessKeyId &&
      secretAccessKey &&
      !accessKeyId.includes('CHANGE_ME') &&
      !accessKeyId.includes('your_') &&
      accessKeyId.trim() !== '';

    const baseConfig: any = {
      region: this.region,
      ...(hasExplicitCredentials && {
        credentials: {
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
        },
      }),
      ...(forcePathStyle && { forcePathStyle: true }),
    };

    this.s3Client = new S3Client({
      ...baseConfig,
      ...(internalEndpoint && { endpoint: internalEndpoint }),
    });

    this.publicS3Client = new S3Client({
      ...baseConfig,
      ...(publicEndpoint && { endpoint: publicEndpoint }),
    });
  }

  async onModuleInit() {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      console.log(`Storage initialized (connected to bucket: ${this.bucket})`);
    } catch (err: any) {
      if (err.name === 'NotFound' || err.name === 'NoSuchBucket' || err.$metadata?.httpStatusCode === 404) {
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
          console.log(`Storage initialized: Bucket '${this.bucket}' created successfully`);
        } catch (createErr) {
          console.error(`Failed to create bucket '${this.bucket}'`, createErr);
        }
      } else {
        console.error('Storage bucket check failed', err);
      }
    }
  }

  private parseExpirySeconds(
    value: string | undefined,
    fallback: number,
  ): number {
    if (!value?.trim()) {
      return fallback;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  }

  private normalizeFolder(folder = 'messaging'): string {
    const normalized = folder
      .trim()
      .replace(/[^a-zA-Z0-9/_-]/g, '')
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/')
      .replace(/\/+$/g, '');

    const cleaned = normalized.replace(/\/+$/g, '').replace(/\/+/g, '/');

    if (!AwsS3Service.ALLOWED_UPLOAD_FOLDERS.has(cleaned)) {
      throw new BadRequestException('Unsupported upload folder');
    }

    return cleaned;
  }

  private resolveS3Key(value: string): string {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
      throw new BadRequestException('key is required');
    }

    const extractedKey = this.extractFileKeyFromUrl(trimmedValue);
    if (!extractedKey) {
      throw new BadRequestException('Unable to resolve S3 object key');
    }

    return extractedKey;
  }

  private isBucketVirtualHostedUrl(hostname: string): boolean {
    return [
      `${this.bucket}.s3.${this.region}.amazonaws.com`,
      `${this.bucket}.s3.amazonaws.com`,
    ].includes(hostname);
  }

  private isBucketPathStyleUrl(hostname: string, pathname: string): boolean {
    const bucketPrefix = `/${this.bucket}/`;
    return (
      [`s3.${this.region}.amazonaws.com`, 's3.amazonaws.com'].includes(
        hostname,
      ) && pathname.startsWith(bucketPrefix)
    );
  }

  private isCustomEndpointUrl(hostname: string, pathname: string): boolean {
    if (!this.publicEndpoint) return false;
    try {
      const ep = new URL(this.publicEndpoint);
      return ep.hostname.toLowerCase() === hostname && pathname.startsWith(`/${this.bucket}/`);
    } catch {
      return false;
    }
  }

  async createPresignedUploadUrl(
    fileName: string,
    contentType: string,
    options: PresignedUploadOptions = {},
  ): Promise<{
    key: string;
    fileKey: string;
    uploadUrl: string;
    fileUrl: string;
    downloadUrl: string;
    expiresIn: number;
  }> {
    if (!fileName?.trim()) {
      throw new BadRequestException('fileName is required');
    }

    if (!contentType?.trim()) {
      throw new BadRequestException('contentType is required');
    }

    const expiresIn = options.expiresIn ?? AwsS3Service.DEFAULT_UPLOAD_EXPIRY;
    const folder = this.normalizeFolder(options.folder ?? 'messaging');
    const safeName = this.sanitizeFileName(fileName);
    const key = `${folder}/${Date.now()}-${randomUUID()}-${safeName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.publicS3Client, command, {
        expiresIn,
      });
      const downloadUrl = await this.getDownloadUrl(key).then(
        (result) => result.downloadUrl,
      );

      return {
        key,
        fileKey: key,
        uploadUrl,
        fileUrl: downloadUrl,
        downloadUrl,
        expiresIn,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `S3 presign failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async uploadFileToS3(
    file: Express.Multer.File,
    folder = 'messaging',
  ): Promise<UploadedS3File> {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }

    const safeName = this.sanitizeFileName(file.originalname);
    const key = `${this.normalizeFolder(folder)}/${Date.now()}-${randomUUID()}-${safeName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    const downloadUrl = await this.getDownloadUrl(key).then(
      (result) => result.downloadUrl,
    );

    return {
      key,
      url: downloadUrl,
      downloadUrl,
    };
  }

  async deleteFileFromS3(fileKey: string): Promise<void> {
    const key = fileKey?.trim() ? this.resolveS3Key(fileKey) : null;
    if (!key) {
      return;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `S3 delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getFileBuffer(fileKey: string): Promise<Buffer> {
    const key = this.resolveS3Key(fileKey);
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const byteArray = await response.Body?.transformToByteArray();
      if (!byteArray) {
        throw new Error('Failed to read file body from S3');
      }
      return Buffer.from(byteArray);
    } catch (error) {
      throw new InternalServerErrorException(
        `S3 getFileBuffer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  extractFileKeyFromUrl(fileUrl: string): string | null {
    if (!fileUrl?.trim()) {
      return null;
    }

    const trimmedValue = fileUrl.trim();

    if (!/^https?:\/\//i.test(trimmedValue)) {
      return trimmedValue;
    }

    try {
      const parsedUrl = new URL(trimmedValue);
      const hostname = parsedUrl.hostname.toLowerCase();
      const pathname = parsedUrl.pathname.startsWith('/')
        ? parsedUrl.pathname
        : `/${parsedUrl.pathname}`;

      if (this.isBucketVirtualHostedUrl(hostname)) {
        const key = pathname.slice(1);
        return key ? decodeURIComponent(key) : null;
      }

      if (this.isBucketPathStyleUrl(hostname, pathname)) {
        const key = pathname.slice(this.bucket.length + 2);
        return key ? decodeURIComponent(key) : null;
      }

      if (this.isCustomEndpointUrl(hostname, pathname)) {
        const key = pathname.slice(this.bucket.length + 2);
        return key ? decodeURIComponent(key) : null;
      }

      return null;
    } catch {
      return null;
    }
  }

  async getDownloadUrl(
    keyOrUrl: string,
    options: { expiresIn?: number } = {},
  ): Promise<{ key: string; downloadUrl: string }> {
    const key = this.resolveS3Key(keyOrUrl);
    const expiresIn = options.expiresIn ?? this.signedUrlExpirySeconds;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const downloadUrl = await getSignedUrl(this.publicS3Client, command, {
        expiresIn,
      });

      return { key, downloadUrl };
    } catch (error) {
      console.error(
        `Failed to generate download URL: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  async resolveFileUrl(
    keyOrUrl?: string | null,
    options: { expiresIn?: number } = {},
  ): Promise<string | null> {
    const trimmedValue = keyOrUrl?.trim();
    if (!trimmedValue) {
      return null;
    }

    const key = this.extractFileKeyFromUrl(trimmedValue);
    if (!key) {
      return /^https?:\/\//i.test(trimmedValue) ? trimmedValue : null;
    }

    try {
      return (await this.getDownloadUrl(key, options)).downloadUrl;
    } catch {
      if (/^https?:\/\//i.test(trimmedValue)) {
        return trimmedValue;
      }

      throw new InternalServerErrorException('Failed to resolve file URL');
    }
  }

  async resolveFileUrls(
    values?: Array<string | null | undefined>,
    options: { expiresIn?: number } = {},
  ): Promise<string[]> {
    if (!values?.length) {
      return [];
    }

    const resolved = await Promise.all(
      values.map((value) => this.resolveFileUrl(value, options)),
    );

    return resolved.filter((value): value is string => Boolean(value));
  }
}
