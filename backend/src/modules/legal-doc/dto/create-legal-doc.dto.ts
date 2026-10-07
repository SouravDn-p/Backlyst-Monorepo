import { IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LegalDocumentType } from '@prisma/client';

export class CreateLegalDocVersionDto {
  @ApiProperty({
    enum: LegalDocumentType,
    example: LegalDocumentType.TERMS_AND_CONDITIONS,
    description: 'Type of legal document',
  })
  @IsEnum(LegalDocumentType)
  type: LegalDocumentType;

  @ApiProperty({
    example: 'This is the full legal document content...',
    minLength: 10,
    description: 'Content of the legal document version',
  })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiProperty({
    example: '1.0.0',
    description: 'Version identifier (e.g., 1.0.0, 1.1.0)',
  })
  @IsString()
  version: string;
}
