import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { AdminAuthorizationService } from './admin-authorization.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ReplaceAdminPermissionsDto } from './dto/replace-admin-permissions.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@ApiTags('Admin Authorization')
@ApiBearerAuth(ACCESS_TOKEN)
@Roles(UserRole.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/authorization')
export class AdminAuthorizationController {
  constructor(
    private readonly adminAuthorizationService: AdminAuthorizationService,
  ) {}

  @Get('sections')
  @ApiOperation({ summary: 'Get admin authorization sections and actions' })
  getSections() {
    return this.adminAuthorizationService.getSections();
  }

  @Get('admins')
  @ApiOperation({ summary: 'List admin accounts' })
  listAdmins() {
    return this.adminAuthorizationService.listAdmins();
  }

  @Post('admins')
  @ApiOperation({ summary: 'Create a normal admin account' })
  createAdmin(
    @CurrentUser('id') actorId: string,
    @Body() payload: CreateAdminDto,
  ) {
    return this.adminAuthorizationService.createAdmin(actorId, payload);
  }

  @Get('admins/:id')
  @ApiOperation({ summary: 'Get one admin account and permissions' })
  getAdmin(@Param('id') adminId: string) {
    return this.adminAuthorizationService.getAdmin(adminId);
  }

  @Patch('admins/:id')
  @ApiOperation({ summary: 'Update a normal admin account' })
  updateAdmin(
    @CurrentUser('id') actorId: string,
    @Param('id') adminId: string,
    @Body() payload: UpdateAdminDto,
  ) {
    return this.adminAuthorizationService.updateAdmin(
      actorId,
      adminId,
      payload,
    );
  }

  @Delete('admins/:id')
  @ApiOperation({ summary: 'Soft-delete a normal admin account' })
  deleteAdmin(
    @CurrentUser('id') actorId: string,
    @Param('id') adminId: string,
  ) {
    return this.adminAuthorizationService.deleteAdmin(actorId, adminId);
  }

  @Put('admins/:id/permissions')
  @ApiOperation({ summary: 'Replace one normal admin permission matrix' })
  replacePermissions(
    @CurrentUser('id') actorId: string,
    @Param('id') adminId: string,
    @Body() payload: ReplaceAdminPermissionsDto,
  ) {
    return this.adminAuthorizationService.replacePermissions(
      actorId,
      adminId,
      payload,
    );
  }
}
