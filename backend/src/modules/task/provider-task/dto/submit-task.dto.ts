import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum FinalTaskTypeDtoEnum {
  BACKLINK = 'BACKLINK',
  GUEST_POST = 'GUEST_POST',
}

export class SubmitTaskDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({
    example:
      'Delivered placement with all requested requirements. Please review.',
    description: 'Main delivery message shown to requester.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(1500)
  deliveryMessage!: string;

  @ApiPropertyOptional({
    example: 'https://drive.google.com/file/d/xxxxx/view',
    description: 'Optional external proof URL (drive, sheet, report, etc.).',
  })
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  proofUrl?: string;

  @ApiPropertyOptional({
    example: 'Password for archive: 1234',
    description: 'Optional additional notes for requester.',
  })
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalNotes?: string;

  @ApiPropertyOptional({
    enum: FinalTaskTypeDtoEnum,
    example: FinalTaskTypeDtoEnum.GUEST_POST,
    description:
      'Required only when task placementType is FLEXIBLE. Determines final credit settlement.',
  })
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : value,
  )
  @IsOptional()
  @IsEnum(FinalTaskTypeDtoEnum)
  finalTaskType?: FinalTaskTypeDtoEnum;
}
