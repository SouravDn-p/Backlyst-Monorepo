import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';
import { UserRoleEnum } from 'src/common/enum';

export class ChangeRoleDto {
  @ApiProperty({
    enum: UserRoleEnum,
    description: 'Role to assign to the user',
    examples: [UserRoleEnum.USER, UserRoleEnum.ADMIN],
  })
  @IsEnum(UserRole, {
    message: 'role must be a valid UserRole value',
  })
  role: UserRole;
}
