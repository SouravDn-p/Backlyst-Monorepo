import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMarkdownBlogDto {
  @ApiProperty({ description: 'The title of the blog post' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'The subtitle of the blog post' })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiPropertyOptional({ description: 'A short description of the blog post' })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional({ description: 'Category for the blog post' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Comma-separated tags (e.g. Tech,News,Update)' })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ description: 'The raw markdown string containing the body of the blog post' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Thumbnail file to upload' })
  thumbnail?: any;
}
