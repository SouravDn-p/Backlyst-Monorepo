import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AdminUserService } from './admin-user.service';
import { AdminUserGovernanceNoteDto } from './dto/admin-user-governance-note.dto';
import { AdminUserRegistryQueryDto } from './dto/admin-user-registry-query.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';

@AdminGuard()
@ApiTags('Admin - User Registry')
@ApiBearerAuth(ACCESS_TOKEN)
@Controller('admin/users')
export class AdminUserRegistryController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get('registry')
  @ApiOperation({
    summary: 'Get admin user registry with credit usage and filters',
  })
  getRegistry(@Query() query: AdminUserRegistryQueryDto) {
    return this.adminUserService.getRegistry(query);
  }

  @Get('registry/:userId')
  @ApiOperation({
    summary: 'Get admin user registry profile detail',
  })
  getRegistryProfile(@Param('userId') userId: string) {
    return this.adminUserService.getRegistryProfile(userId);
  }

  @Post('registry/:userId/reset-password')
  @ApiOperation({
    summary: 'Send password reset OTP to a user by admin',
  })
  resetPassword(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminUserService.resetPasswordByAdmin(userId, adminId);
  }

  @Patch('registry/:userId/suspend')
  @ApiOperation({
    summary: 'Suspend a user from registry profile',
  })
  suspendAccount(
    @Param('userId') userId: string,
    @Body() payload: SuspendUserDto,
  ) {
    return this.adminUserService.suspendUser(userId, payload);
  }

  @Patch('registry/:userId/ban')
  @ApiOperation({
    summary: 'Ban a user from registry profile',
  })
  banAccount(@Param('userId') userId: string, @Body() payload: BanUserDto) {
    return this.adminUserService.banUser(userId, payload);
  }

  @Post('registry/:userId/force-logout')
  @ApiOperation({
    summary: 'Force logout all active sessions for a user by admin',
  })
  forceLogout(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminUserService.forceLogoutByAdmin(userId, adminId);
  }

  @Post('registry/:userId/notes')
  @ApiOperation({
    summary: 'Append an internal governance note for a user',
  })
  appendGovernanceNote(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() payload: AdminUserGovernanceNoteDto,
  ) {
    return this.adminUserService.appendGovernanceNote(userId, adminId, payload);
  }
}
