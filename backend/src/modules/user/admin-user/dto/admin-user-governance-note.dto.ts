import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminUserGovernanceNoteDto {
  @ApiProperty({
    example: 'Manual review completed. Account remains in good standing.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  note!: string;
}
