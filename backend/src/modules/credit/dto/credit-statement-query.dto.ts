import { CreditAction, CreditReason, CreditType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreditStatementQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(CreditType)
  creditType?: CreditType;

  @IsOptional()
  @IsEnum(CreditAction)
  action?: CreditAction;

  @IsOptional()
  @IsEnum(CreditReason)
  reason?: CreditReason;

  @IsOptional()
  @IsUUID()
  websiteId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
