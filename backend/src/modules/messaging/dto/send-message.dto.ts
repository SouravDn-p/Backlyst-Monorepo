import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiPropertyOptional({
    example: '9cf997b3-f495-4efe-a353-d7c1563dae65',
    description: 'Preferred recipient user id.',
  })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiPropertyOptional({
    example: 'receiver@example.com',
    description: 'Legacy receiver email fallback.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  receiver?: string;

  @ApiPropertyOptional({
    example: 'receiver@example.com',
    description: 'Legacy recipient email fallback.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipientEmail?: string;

  @ApiPropertyOptional({
    example: 'Hello from HTTP API',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @ApiPropertyOptional({
    example: 'Hello from HTTP API',
    description: 'Backward-compatible alias for text.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({
    example: 'b8e9d1df-6baf-4d74-b5d0-5b2b3d70a100',
    description: 'Optional placement task id for task-context chat.',
  })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({
    example: 'messaging/1719980000000-contract.pdf',
    description:
      'S3 object key returned by the presigned upload flow for an optional message attachment.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentKey?: string;
}
