import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminSubscriptionPlanService } from './admin-subscription-plan.service';
import {
  CreateAdminSubscriptionPlanDto,
  PlanTierDtoEnum,
} from './dto/create-admin-subscription-plan.dto';
import { UpdateAdminSubscriptionPlanDto } from './dto/update-admin-subscription-plan.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';

@Controller('admin-subscription-plan')
@ApiTags('Subscription Plan - Admin')
@ApiBearerAuth(ACCESS_TOKEN)
export class AdminSubscriptionPlanController {
  constructor(
    private readonly adminSubscriptionPlanService: AdminSubscriptionPlanService,
  ) {}

  @AdminGuard()
  @Post()
  @ApiOperation({
    summary: 'Create a plan',
    description: 'Allows admin to create a plan.',
  })
  create(
    @Body() createAdminSubscriptionPlanDto: CreateAdminSubscriptionPlanDto,
  ) {
    return this.adminSubscriptionPlanService.create(
      createAdminSubscriptionPlanDto,
    );
  }

  @AdminGuard()
  @Get('all')
  @ApiOperation({
    summary: 'Get all plans',
    description: 'Allows admin to get all plans.',
  })
  @ApiQuery({ name: 'isActive', example: true, required: false })
  @ApiQuery({
    name: 'tier',
    enum: PlanTierDtoEnum,
    enumName: 'PlanTier',
    example: PlanTierDtoEnum.GOLD,
    required: false,
  })
  findAll(
    @Query('isActive') isActive?: string,
    @Query('tier') tier?: PlanTierDtoEnum,
  ) {
    const parsedIsActive =
      isActive === undefined ? undefined : isActive === 'true';

    return this.adminSubscriptionPlanService.findAll(parsedIsActive, tier);
  }

  @AdminGuard()
  @Patch('make-plan-inactive')
  @ApiOperation({
    summary: 'Make a plan inactive',
    description: 'Allows admin to make a plan inactive.',
  })
  @ApiQuery({ name: 'id', example: '1', required: true })
  makePlanInActive(@Query('id') id: string) {
    return this.adminSubscriptionPlanService.makePlanInActive(id);
  }

  @AdminGuard()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update subscription plan configuration',
    description:
      'Updates pricing and tier limits used by the admin billing configuration page.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: 'Plan updated successfully',
        data: {
          id: 'plan-id',
          tier: 'FREE',
          name: 'Free',
          price: '0',
          billingInterval: 'MONTHLY',
          taskCreditsPerCycle: 3,
          maxTaskCreditCapacity: 3,
          maxWebsites: 2,
          visibilityCreditCapacity: 2,
          isActive: true,
        },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAdminSubscriptionPlanDto,
  ) {
    return this.adminSubscriptionPlanService.update(id, payload);
  }
}
