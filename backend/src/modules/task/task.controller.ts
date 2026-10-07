import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';

import { UserGuard } from 'src/common/guards/auth/user.guard';

import { TaskService } from './task.service';

@ApiTags('Task')
@ApiBearerAuth(ACCESS_TOKEN)
@UserGuard()
@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get(':id/deadline-history')
  @ApiOperation({
    summary: 'Get task deadline extension history',
    description:
      'Returns delivery deadline extension history for a task. Access is limited to requester or selected provider involved in that task.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Placement task identifier.',
    example: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
  })
  getDeadlineHistory(
    @Param('id') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskService.getDeadlineHistory(taskId, userId);
  }
}
