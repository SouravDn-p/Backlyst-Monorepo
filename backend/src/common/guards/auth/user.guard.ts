import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

export function UserGuard() {
  return applyDecorators(UseGuards(JwtAuthGuard));
}
