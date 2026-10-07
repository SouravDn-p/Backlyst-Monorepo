import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PermissionGuard } from './permission.guard';

export function AdminGuard() {
  return applyDecorators(
    Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
    UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard),
  );
}
