import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { UserRole, UserStatus } from '@prisma/client';
import { ChangeRoleDto } from './dto/change-role.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { GetUserRegistryQueryDto } from './dto/get-user-registry-query.dto';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminRegistryActionDto } from './dto/admin-registry-action.dto';
import { AppendGovernanceNoteDto } from './dto/append-governance-note.dto';

@AdminGuard()
@ApiTags('Admin - User Management')
@ApiBearerAuth(ACCESS_TOKEN)
@Controller('admin-user')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Patch('block-user/:userId')
  @ApiOperation({
    summary: 'Block a user',
    description:
      'Marks a user as BLOCKED. Only admins can perform this action.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    required: true,
    description: 'Unique identifier of the user to be blocked',
  })
  blockUser(@Param('userId') userId: string, @Body() payload: BanUserDto) {
    return this.adminUserService.banUser(userId, payload);
  }

  @Patch('suspend-user/:userId')
  @ApiOperation({
    summary: 'Suspend a user',
    description:
      'Marks a user as SUSPENDED. Only admins can perform this action.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    required: true,
    description: 'Unique identifier of the user to be suspended',
  })
  suspendUser(
    @Param('userId') userId: string,
    @Body() payload: SuspendUserDto,
  ) {
    return this.adminUserService.suspendUser(userId, payload);
  }

  @Patch('reactivate-user/:userId')
  @ApiOperation({
    summary: 'reactivate a user',
    description: 'Marks a user as ACTIVE. Only admins can perform this action.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    required: true,
    description: 'Unique identifier of the user to be reactivated',
  })
  reactivateUser(@Param('userId') userId: string) {
    return this.adminUserService.reactivateUser(userId);
  }

  @Delete('admin/delete-user/:id')
  @ApiOperation({
    summary: 'Delete a user by admin',
    description:
      'Deletes a user from the system. Only admins can perform this action.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Unique identifier of the user to be deleted',
  })
  deleteUserByAdmin(@Param('id') id: string) {
    return this.adminUserService.deleteUserByAdmin(id);
  }

  @AdminGuard()
  @Patch('change-role/:id')
  @ApiOperation({
    summary: 'Change user role by admin',
    description:
      'Changes the role of a user. Only admins can perform this action.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Unique identifier of the user to change role',
  })
  changeRoleByAdmin(@Param('id') id: string, @Body() payload: ChangeRoleDto) {
    return this.adminUserService.changeRoleByAdmin(id, payload.role);
  }

  @Get('registry')
  @ApiOperation({
    summary: 'Get admin user registry rows',
    description:
      'Admin page note: returns rows for the User Registry page, including email identity, subscription tier, governance status, country, verified assets, credits used/allowed, referral summary, and profile action metadata.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'governance@cybertyne.com',
    description: 'Search by email address',
  })
  @ApiQuery({
    name: 'subscriptionTier',
    required: false,
    enum: ['SILVER', 'GOLD', 'PLATINUM', 'ENTERPRISE'],
    description: 'Filter by active subscription tier',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UserStatus,
    description: 'Filter by governance/account status',
  })
  @ApiQuery({
    name: 'referralStatus',
    required: false,
    enum: [
      'SIGNED_UP',
      'WEBSITE_VERIFIED',
      'FIRST_BACKLINK_ACCEPTED',
      'PAID_SUBSCRIPTION',
    ],
    description: 'Filter by sent or received referral stage',
  })
  getUserRegistry(@Query() query: GetUserRegistryQueryDto) {
    return this.adminUserService.getUserRegistry(query);
  }

  @Get('registry/:userId')
  @ApiOperation({
    summary: 'Get admin user registry profile',
    description:
      'Admin page note: detail endpoint for the User Registry VIEW PROFILE action, including user identity, subscription, verified assets, referral status, and credit used/allowed breakdown.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    required: true,
    description: 'User identifier from the registry row.',
  })
  getUserRegistryProfile(@Param('userId') userId: string) {
    return this.adminUserService.getUserRegistryProfile(userId);
  }

  @Post('registry/:userId/suspend')
  @ApiOperation({
    summary: 'Suspend user from registry oversight profile',
    description:
      'Admin page action for the SUSPEND ACCOUNT button. Suspends the account and appends an internal governance note.',
  })
  @ApiParam({ name: 'userId', type: String })
  suspendUserFromRegistry(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() payload: SuspendUserDto,
  ) {
    return this.adminUserService.suspendUserFromRegistry(
      userId,
      adminId,
      payload,
    );
  }

  @Post('registry/:userId/ban')
  @ApiOperation({
    summary: 'Ban user from registry oversight profile',
    description:
      'Admin page action for the BAN ACCOUNT button. Bans the account and appends an internal governance note.',
  })
  @ApiParam({ name: 'userId', type: String })
  banUserFromRegistry(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() payload: BanUserDto,
  ) {
    return this.adminUserService.banUserFromRegistry(userId, adminId, payload);
  }

  @Post('registry/:userId/reset-password')
  @ApiOperation({
    summary: 'Send admin-triggered password reset email',
    description:
      'Admin page action for the RESET PASSWORD button. Sends a password reset OTP to the user and appends an internal governance note.',
  })
  @ApiParam({ name: 'userId', type: String })
  resetPasswordFromRegistry(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() payload: AdminRegistryActionDto,
  ) {
    return this.adminUserService.resetPasswordFromRegistry(
      userId,
      adminId,
      payload,
    );
  }

  @Post('registry/:userId/force-logout')
  @ApiOperation({
    summary: 'Force logout all active user sessions',
    description:
      'Admin page action for the FORCE LOGOUT button. Marks all active sessions as logged out and appends an internal governance note.',
  })
  @ApiParam({ name: 'userId', type: String })
  forceLogoutFromRegistry(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() payload: AdminRegistryActionDto,
  ) {
    return this.adminUserService.forceLogoutFromRegistry(
      userId,
      adminId,
      payload,
    );
  }

  @Post('registry/:userId/governance-notes')
  @ApiOperation({
    summary: 'Append internal governance note',
    description:
      'Admin page action for APPEND NOTE TO LEDGER. Notes are timestamped, admin-attributed, and not visible to the user.',
  })
  @ApiParam({ name: 'userId', type: String })
  appendGovernanceNote(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() payload: AppendGovernanceNoteDto,
  ) {
    return this.adminUserService.appendGovernanceNote(userId, adminId, payload);
  }

  @AdminGuard()
  @Get()
  @ApiOperation({
    summary: 'Get all users with pagination, filters, and search',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UserStatus,
    description: 'Filter by user status',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'john',
    description: 'Search by name or email',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: UserStatus,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ) {
    return this.adminUserService.findAll(
      page,
      limit,
      {
        status,
        role,
      },
      search,
    );
  }

  @Patch('force-logout/:userId')
  @ApiOperation({
    summary: 'Force logout all sessions of a user',
    description:
      'Logs out all active sessions of the selected user. Only admins can perform this action.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    required: true,
    description: 'Unique identifier of the user to force logout',
  })
  forceLogoutUser(@Param('userId') userId: string) {
    return this.adminUserService.forceLogoutUser(userId);
  }
}
