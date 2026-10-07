// dto/create-blog-post.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { BlockDto } from './block.dto';

export class CreateBlogPostDto {
  @ApiProperty({ example: 'UX review presentations' })
  @IsString() @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'How to grow through customer feedback and a driven mindset' })
  @IsString() @IsOptional()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cover.jpg' })
  @IsString() @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({ example: ['design', 'ux'], type: [String] })
  @IsArray() @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: 'UX Design' })
  @IsString() @IsOptional()
  category?: string;


  @ApiProperty({
    type: () => [BlockDto],
    example: [
      {
        type: 'SECTION_TITLE',
        order: 0,
        content: 'Introduction',
        style: { fontSize: 24, fontWeight: 'bold', textAlign: 'left' },
      },
      {
        type: 'DESCRIPTION',
        order: 1,
        content: 'Millions of businesses around the world are utilizing...',
        style: { fontSize: 16, fontWeight: 'normal' },
      },
      {
        type: 'QUOTE',
        order: 2,
        content: 'This is a beautiful and inspiring quote.',
        style: { fontSize: 18, fontStyle: 'italic' },
      },
      {
        type: 'IMAGE',
        order: 3,
        url: 'https://cdn.example.com/image.jpg',
        caption: 'Someone working in an office',
      },
      {
        type: 'VIDEO',
        order: 4,
        url: 'https://cdn.example.com/video.mp4',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks!: BlockDto[];
}