import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import {
  ADMIN_PERMISSION_KEY,
  RequiredAdminPermission,
} from 'src/common/decorator/require-permission.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

const ACTION_TO_FIELD = {
  create: 'canCreate',
  read: 'canRead',
  update: 'canUpdate',
  delete: 'canDelete',
} as const;

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<RequiredAdminPermission>(
      ADMIN_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === UserRole.SUPER_ADMIN) return true;
    if (user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required.');
    }

    const permission = await this.prisma.adminPermission.findUnique({
      where: {
        adminId_section: {
          adminId: user.id,
          section: required.section,
        },
      },
    });

    const field = ACTION_TO_FIELD[required.action];
    if (!permission?.[field]) {
      throw new ForbiddenException(
        'You do not have permission to access this admin section.',
      );
    }

    return true;
  }
}
