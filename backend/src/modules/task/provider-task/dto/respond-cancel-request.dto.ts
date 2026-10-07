import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum CancelRequestActionDtoEnum {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
}

export class RespondCancelRequestDto {
  @ApiProperty({
    enum: CancelRequestActionDtoEnum,
    example: CancelRequestActionDtoEnum.ACCEPT,
    description: 'Provider decision for requester cancellation request.',
  })
  @IsEnum(CancelRequestActionDtoEnum)
  action!: CancelRequestActionDtoEnum;

  @ApiPropertyOptional({
    example: 'Accepted cancellation request.',
    description: 'Optional note for cancellation decision.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
