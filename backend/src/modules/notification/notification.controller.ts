import { Controller, Get, Param, Patch, Query, Body } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@ApiTags('Notifications')
@ApiBearerAuth(ACCESS_TOKEN)
@UserGuard()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiOkResponse({ description: 'Notifications fetched successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.getMyNotifications(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get my unread notification count' })
  @ApiOkResponse({
    description: 'Unread notification count fetched successfully',
  })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Notification marked as read successfully' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  markAsRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationService.markAsRead(userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @ApiOkResponse({ description: 'Notifications marked as read successfully' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get my notification preferences' })
  @ApiOkResponse({
    description: 'Notification preferences fetched successfully',
  })
  getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationService.getPreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update my notification preferences' })
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  @ApiOkResponse({
    description: 'Notification preferences updated successfully',
  })
  @ApiForbiddenResponse({ description: 'User is not active' })
  updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(userId, dto);
  }
}
