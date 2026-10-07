import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { sendResponse } from 'src/utils/sendResponse';
import { NotificationService } from './notification.service';
import { AdminNotificationQueryDto } from './dto/admin-notification-query.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { SendAdminNotificationInput } from './types/notification.types';

@ApiTags('Admin Notifications')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/notifications')
export class AdminNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get my admin notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiOkResponse({ description: 'Admin notifications fetched successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getAdminNotifications(
    @CurrentUser('id') adminId: string,
    @Query() query: AdminNotificationQueryDto,
  ) {
    return this.notificationService.getAdminNotifications(adminId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get my admin unread notification count' })
  getAdminUnreadCount(@CurrentUser('id') adminId: string) {
    return this.notificationService.getAdminUnreadCount(adminId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one admin notification as read' })
  @ApiParam({ name: 'id', type: String })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  markAdminAsRead(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.notificationService.markAdminAsRead(adminId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all my admin notifications as read' })
  markAllAdminAsRead(@CurrentUser('id') adminId: string) {
    return this.notificationService.markAllAdminAsRead(adminId);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send an admin-wide in-app notification' })
  @ApiBody({ type: SendNotificationDto })
  @ApiOkResponse({ description: 'Admin notification sent successfully' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async sendAdminNotification(@Body() dto: SendNotificationDto) {
    const notifications = await this.notificationService.sendAdminNotification(
      dto as SendAdminNotificationInput,
    );
    return sendResponse('Admin notification sent successfully', notifications);
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast an admin-wide in-app notification' })
  @ApiBody({ type: SendNotificationDto })
  async broadcastAdminNotification(@Body() dto: SendNotificationDto) {
    const notifications = await this.notificationService.sendAdminNotification(
      dto as SendAdminNotificationInput,
    );
    return sendResponse(
      'Admin notification broadcast successfully',
      notifications,
    );
  }
}
