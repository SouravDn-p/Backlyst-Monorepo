import { SetMetadata } from '@nestjs/common';
import { AdminAuthorizationSection } from '@prisma/client';

export const ADMIN_PERMISSION_KEY = 'admin_permission';

export type AdminPermissionAction = 'create' | 'read' | 'update' | 'delete';

export type RequiredAdminPermission = {
  section: AdminAuthorizationSection;
  action: AdminPermissionAction;
};

export const RequirePermission = (
  section: AdminAuthorizationSection,
  action: AdminPermissionAction,
) => SetMetadata(ADMIN_PERMISSION_KEY, { section, action });
