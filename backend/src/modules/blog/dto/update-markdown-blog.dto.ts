import { PartialType } from '@nestjs/swagger';
import { CreateMarkdownBlogDto } from './create-markdown-blog.dto';

export class UpdateMarkdownBlogDto extends PartialType(CreateMarkdownBlogDto) {}
