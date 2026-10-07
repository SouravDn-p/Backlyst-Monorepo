import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const uploadFolders = [
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
] as const;

export class PresignUploadDto {
  @ApiProperty({
    example: 'avatar.png',
    description: 'Original file name that will be used to generate the S3 key.',
  })
  @IsString()
  fileName!: string;

  @ApiProperty({
    example: 'image/png',
    description: 'MIME type that the client will send to S3 during upload.',
  })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({
    example: 'user',
    enum: uploadFolders,
    description: 'Logical upload folder used to namespace the generated key.',
  })
  @IsOptional()
  @IsString()
  @IsIn(uploadFolders)
  folder?: string;

  @ApiPropertyOptional({
    example: 900,
    description: 'Optional upload URL expiry in seconds. Defaults to 900.',
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresIn?: number;
}
