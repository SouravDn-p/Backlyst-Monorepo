import { ApiProperty } from "@nestjs/swagger";
import { EnquiryStatus } from "@prisma/client";
import { IsBoolean, IsEnum } from "class-validator";

// dto/update-status.dto.ts
export class UpdateStatusDto {
    @ApiProperty({ enum: EnquiryStatus, example: EnquiryStatus.RESOLVED })
    @IsEnum(EnquiryStatus)
    status!: EnquiryStatus;
}

// dto/update-read.dto.ts
export class UpdateReadDto {
      @ApiProperty({ example: true })
    @IsBoolean()
    isRead!: boolean;
}
