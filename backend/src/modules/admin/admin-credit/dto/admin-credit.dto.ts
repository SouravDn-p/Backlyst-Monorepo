import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AddAdminCreditDto {
  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ example: 'Compensation after manual review.' })
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiProperty({ example: 'admin-adjustment-unique-request-id' })
  @IsString()
  @MaxLength(100)
  idempotencyKey!: string;
}

export class RemoveAdminCreditDto extends AddAdminCreditDto {}

export class UpdateWebsiteWalletLockDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  locked!: boolean;

  @ApiProperty({ example: 'Wallet locked during fraud investigation.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
