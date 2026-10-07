import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogPostMultipartDto {
  @ApiProperty({ description: 'The top-level title of the blog post' })
  title!: string;

  @ApiPropertyOptional({ description: 'JSON string of BlockStyleDto (e.g. {"fontSize":24,"fontWeight":"bold"})' })
  titleStyle?: string;

  @ApiPropertyOptional({ description: 'The top-level subtitle of the blog post' })
  subtitle?: string;

  @ApiPropertyOptional({ description: 'JSON string of BlockStyleDto' })
  subtitleStyle?: string;

  @ApiPropertyOptional({ description: 'A section title block' })
  sectionTitle?: string;

  @ApiPropertyOptional({ description: 'JSON string of BlockStyleDto' })
  sectionTitleStyle?: string;

  @ApiPropertyOptional({ description: 'A section subtitle block' })
  sectionSubtitle?: string;

  @ApiPropertyOptional({ description: 'JSON string of BlockStyleDto' })
  sectionSubtitleStyle?: string;

  @ApiPropertyOptional({ description: 'A description block' })
  description?: string;

  @ApiPropertyOptional({ description: 'JSON string of BlockStyleDto' })
  descriptionStyle?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Video file to upload' })
  video?: any;

  @ApiPropertyOptional({ description: 'Frame size for the video (e.g. large, medium, small)' })
  videoFrameSize?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Image file to upload' })
  image?: any;

  @ApiPropertyOptional({ description: 'Frame size for the image (e.g. large, medium, small)' })
  imageFrameSize?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Thumbnail file to upload' })
  thumbnail?: any;

  @ApiPropertyOptional({ description: 'Category for the blog post' })
  category?: string;

  @ApiPropertyOptional({ description: 'Comma-separated tags (e.g. Tech,News,Update)' })
  tags?: string;

  @ApiPropertyOptional({ description: 'JSON string of an array of extra BlockDto objects added via "Add Field"' })
  extraBlocks?: string;

  @ApiPropertyOptional({ description: 'JSON string array defining the order of the blocks (e.g. ["title","subtitle","video","extra_0","image"]). Essential for drag and drop.' })
  order?: string;
}
