import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    example: 'profile-image.png',
    description: 'Original file name including extension',
  })
  @IsString()
  @Length(1, 255)
  fileName!: string;

  @ApiProperty({
    example: 'image/png',
    description: 'MIME type of the file',
  })
  @IsString()
  @Matches(/^[a-z]+\/[a-z0-9.+-]+$/i, {
    message: 'fileType must be a valid MIME type',
  })
  fileType!: string;
}
