import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AppendGovernanceNoteDto {
  @ApiProperty({
    example: 'Reviewed account manually after unusual credit activity.',
    description:
      'Internal admin note. This is not visible to the user and is stored in the governance ledger.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  note: string;
}
