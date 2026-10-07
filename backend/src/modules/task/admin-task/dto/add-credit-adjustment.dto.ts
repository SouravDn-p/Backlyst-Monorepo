import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum CreditAdjustmentTypeDtoEnum {
  REFUND = 'REFUND',
  REVERSE = 'REVERSE',
  ADD = 'ADD',
}

export class AddCreditAdjustmentDto {
  @ApiProperty({ enum: CreditAdjustmentTypeDtoEnum })
  @IsEnum(CreditAdjustmentTypeDtoEnum)
  adjustmentType!: CreditAdjustmentTypeDtoEnum;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Credits to refund/reverse. If omitted for REVERSE, full reserved amount is used.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiProperty({ example: 'Partial credit refund due to quality dispute.' })
  @IsString()
  @MaxLength(500)
  note!: string;
}
