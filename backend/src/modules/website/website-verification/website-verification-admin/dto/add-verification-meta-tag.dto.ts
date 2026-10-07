import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddWebsiteVerificationMetaTagDto {
  @ApiProperty({
    example: 'backlyst-verification',
    description: 'Meta tag name attribute used for website verification',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  metaName!: string;

  @ApiProperty({
    example: 'b1_9a2f1b8415412',
    description: 'Meta tag content/token value used for verification',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  verificationToken!: string;
}
