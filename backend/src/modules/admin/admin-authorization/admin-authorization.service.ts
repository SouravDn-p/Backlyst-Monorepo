import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAuthorizationAuditAction,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  ADMIN_AUTHORIZATION_ACTIONS,
  ADMIN_AUTHORIZATION_SECTIONS,
  buildSuperAdminPermissions,
} from './authorization-sections.constant';
import { CreateAdminDto } from './dto/create-admin.dto';
import {
  AdminPermissionItemDto,
  ReplaceAdminPermissionsDto,
} from './dto/replace-admin-permissions.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  getSections() {
    return sendResponse('Admin authorization sections fetched successfully', {
      sections: ADMIN_AUTHORIZATION_SECTIONS,
      actions: ADMIN_AUTHORIZATION_ACTIONS,
    });
  }

  async listAdmins() {
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
        isDeleted: false,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      select: this.adminListSelect(),
    });

    return sendResponse('Admins fetched successfully', {
      admins: admins.map((admin) => this.serializeAdmin(admin)),
    });
  }

  async createAdmin(actorId: string, payload: CreateAdminDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const permissions = payload.permissions
      ? this.assertUniqueSections(payload.permissions)
      : [];
    const password = await bcrypt.hash(payload.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const admin = await tx.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          password,
          phoneNumber: payload.phoneNumber,
          companyName: payload.companyName,
          role: UserRole.ADMIN,
          isVerified: true,
          status: UserStatus.ACTIVE,
          registrationTime: new Date(),
        },
        select: this.adminListSelect(),
      });

      if (permissions.length) {
        await tx.adminPermission.createMany({
          data: permissions.map((permission) => ({
            adminId: admin.id,
            section: permission.section,
            canCreate: permission.canCreate,
            canRead: permission.canRead,
            canUpdate: permission.canUpdate,
            canDelete: permission.canDelete,
            assignedById: actorId,
          })),
        });
      }

      await this.createAudit(tx, {
        actorId,
        targetAdminId: admin.id,
        action: AdminAuthorizationAuditAction.ADMIN_CREATED,
        newValue: {
          admin: this.serializeAdmin(admin),
          permissions,
        } as unknown as Prisma.InputJsonValue,
      });

      return admin;
    });

    return sendResponse('Admin created successfully', {
      admin: this.serializeAdmin(result),
    });
  }

  async getAdmin(adminId: string) {
    const admin = await this.findAdmin(adminId);

    return sendResponse('Admin fetched successfully', {
      admin: this.serializeAdminDetail(admin),
    });
  }

  async updateAdmin(actorId: string, adminId: string, payload: UpdateAdminDto) {
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('At least one field is required to update');
    }

    const existing = await this.findEditableAdmin(adminId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const admin = await tx.user.update({
        where: { id: adminId },
        data: {
          name: payload.name,
          phoneNumber: payload.phoneNumber,
          companyName: payload.companyName,
          country: payload.country,
          status: payload.status,
        },
        select: this.adminListSelect(),
      });

      await this.createAudit(tx, {
        actorId,
        targetAdminId: adminId,
        action: AdminAuthorizationAuditAction.ADMIN_UPDATED,
        previousValue: this.serializeAdmin(existing),
        newValue: this.serializeAdmin(admin),
      });

      return admin;
    });

    return sendResponse('Admin updated successfully', {
      admin: this.serializeAdmin(updated),
    });
  }

  async deleteAdmin(actorId: string, adminId: string) {
    const existing = await this.findEditableAdmin(adminId);

    const deleted = await this.prisma.$transaction(async (tx) => {
      const admin = await tx.user.update({
        where: { id: adminId },
        data: {
          isDeleted: true,
          status: UserStatus.DELETED,
        },
        select: this.adminListSelect(),
      });

      await tx.adminPermission.deleteMany({ where: { adminId } });

      await this.createAudit(tx, {
        actorId,
        targetAdminId: adminId,
        action: AdminAuthorizationAuditAction.ADMIN_DELETED,
        previousValue: this.serializeAdmin(existing),
        newValue: this.serializeAdmin(admin),
      });

      return admin;
    });

    return sendResponse('Admin deleted successfully', {
      admin: this.serializeAdmin(deleted),
    });
  }

  async replacePermissions(
    actorId: string,
    adminId: string,
    payload: ReplaceAdminPermissionsDto,
  ) {
    const permissions = this.assertUniqueSections(payload.permissions);
    await this.findEditableAdmin(adminId);

    const result = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.adminPermission.findMany({
        where: { adminId },
        orderBy: { section: 'asc' },
        select: this.permissionSelect(),
      });

      await tx.adminPermission.deleteMany({ where: { adminId } });

      await tx.adminPermission.createMany({
        data: permissions.map((permission) => ({
          adminId,
          section: permission.section,
          canCreate: permission.canCreate,
          canRead: permission.canRead,
          canUpdate: permission.canUpdate,
          canDelete: permission.canDelete,
          assignedById: actorId,
        })),
      });

      const updated = await tx.adminPermission.findMany({
        where: { adminId },
        orderBy: { section: 'asc' },
        select: this.permissionSelect(),
      });

      await this.createAudit(tx, {
        actorId,
        targetAdminId: adminId,
        action: AdminAuthorizationAuditAction.PERMISSIONS_REPLACED,
        previousValue: previous,
        newValue: updated,
        reason: payload.reason,
      });

      return updated;
    });

    return sendResponse('Admin permissions replaced successfully', {
      permissions: result,
    });
  }

  async buildAuthorizationForUser(userId: string, role: string) {
    if (role === UserRole.SUPER_ADMIN) {
      return {
        isSuperAdmin: true,
        permissions: buildSuperAdminPermissions(),
      };
    }

    if (role !== UserRole.ADMIN) {
      return null;
    }

    const permissions = await this.prisma.adminPermission.findMany({
      where: { adminId: userId },
      orderBy: { section: 'asc' },
      select: this.permissionSelect(),
    });

    return {
      isSuperAdmin: false,
      permissions,
    };
  }

  private assertUniqueSections(permissions: AdminPermissionItemDto[]) {
    const seen = new Set<string>();

    for (const permission of permissions) {
      if (seen.has(permission.section)) {
        throw new BadRequestException(
          `Duplicate permission section: ${permission.section}`,
        );
      }

      seen.add(permission.section);
    }

    return permissions;
  }

  private async findAdmin(adminId: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
        isDeleted: false,
      },
      select: {
        ...this.adminListSelect(),
        adminPermissions: {
          orderBy: { section: 'asc' },
          select: this.permissionSelect(),
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return admin;
  }

  private async findEditableAdmin(adminId: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
        isDeleted: false,
      },
      select: this.adminListSelect(),
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin accounts cannot be modified.');
    }

    return admin;
  }

  private adminListSelect() {
    return {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      companyName: true,
      country: true,
      role: true,
      status: true,
      isVerified: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.UserSelect;
  }

  private permissionSelect() {
    return {
      section: true,
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    } satisfies Prisma.AdminPermissionSelect;
  }

  private serializeAdmin<T extends { isDeleted?: boolean }>(admin: T) {
    const { isDeleted, ...safeAdmin } = admin;
    void isDeleted;
    return safeAdmin;
  }

  private serializeAdminDetail<
    T extends { role: UserRole; adminPermissions?: unknown; isDeleted?: boolean },
  >(admin: T) {
    const serialized = this.serializeAdmin(admin);

    if (admin.role === UserRole.SUPER_ADMIN) {
      return {
        ...serialized,
        authorization: {
          isSuperAdmin: true,
          permissions: buildSuperAdminPermissions(),
        },
      };
    }

    return {
      ...serialized,
      authorization: {
        isSuperAdmin: false,
        permissions: admin.adminPermissions ?? [],
      },
    };
  }

  private async createAudit(
    tx: Prisma.TransactionClient,
    data: {
      actorId: string;
      targetAdminId?: string | null;
      action: AdminAuthorizationAuditAction;
      previousValue?: Prisma.InputJsonValue;
      newValue?: Prisma.InputJsonValue;
      reason?: string;
    },
  ) {
    await tx.adminPermissionAuditLog.create({
      data: {
        actorId: data.actorId,
        targetAdminId: data.targetAdminId ?? null,
        action: data.action,
        previousValue: data.previousValue ?? undefined,
        newValue: data.newValue ?? undefined,
        reason: data.reason,
      },
    });
  }
}
