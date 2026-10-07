// dto/block.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, ValidateNested, IsNumber } from 'class-validator';

export enum BlockType {
  TITLE = 'TITLE',
  SUBTITLE = 'SUBTITLE',
  THUMBNAIL = 'THUMBNAIL',
  SECTION_TITLE = 'SECTION_TITLE',
  SECTION_SUBTITLE = 'SECTION_SUBTITLE',
  DESCRIPTION = 'DESCRIPTION',
  QUOTE = 'QUOTE',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  MARKDOWN = 'MARKDOWN',
}

export class BlockStyleDto {
  @ApiPropertyOptional({ example: 24, description: 'Font size in px' })
  @IsOptional() @IsNumber() fontSize?: number;

  @ApiPropertyOptional({ example: 'bold', description: 'normal | bold | 500 | 600 ...' })
  @IsOptional() @IsString() fontWeight?: string;

  @ApiPropertyOptional({ example: 'normal', description: 'normal | italic' })
  @IsOptional() @IsString() fontStyle?: string;

  @ApiPropertyOptional({ example: '#111827' })
  @IsOptional() @IsString() color?: string;

  @ApiPropertyOptional({ example: 'left', description: 'left | center | right' })
  @IsOptional() @IsString() textAlign?: string;

  @ApiPropertyOptional({ example: 'large', description: 'Frame size for Image/Video blocks (e.g. large, medium, small)' })
  @IsOptional() @IsString() frameSize?: string;
}

export class BlockDto {
  @ApiProperty({ enum: BlockType, example: BlockType.SECTION_TITLE })
  @IsEnum(BlockType)
  type!: BlockType;          // <-- user selects this from "Add Field" dropdown

  @ApiProperty({ example: 0, description: 'Position of this block in the post' })
  @IsInt()
  order!: number;

  @ApiPropertyOptional({ example: 'Introduction', description: 'Used for text-based blocks' })
  @IsOptional() @IsString()
  content?: string;         // text-based blocks

  @ApiPropertyOptional({ example: 'https://cdn.example.com/image.jpg', description: 'Used for IMAGE / VIDEO / THUMBNAIL' })
  @IsOptional() @IsString()
  url?: string;              // IMAGE / VIDEO / THUMBNAIL

  @ApiPropertyOptional({ example: 'Someone working in an office' })
  @IsOptional() @IsString()
  caption?: string;

  @ApiPropertyOptional({ type: () => BlockStyleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BlockStyleDto)
  style?: BlockStyleDto;
}