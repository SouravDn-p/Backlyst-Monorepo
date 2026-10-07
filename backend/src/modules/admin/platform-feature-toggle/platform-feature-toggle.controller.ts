import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { UpdatePlatformFeatureTogglesDto } from './dto/update-platform-feature-toggles.dto';
import { PlatformFeatureToggleService } from './platform-feature-toggle.service';

@ApiTags('Admin Platform Feature Toggles')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/platform-feature-toggles')
export class PlatformFeatureToggleController {
  constructor(
    private readonly platformFeatureToggleService: PlatformFeatureToggleService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get platform feature toggles',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: 'Platform feature toggles fetched successfully',
        data: {
          toggles: [
            {
              key: 'USER_REVIEWS_RATINGS',
              label: 'User Reviews & Ratings',
              category: 'STAR-SIGNAL GOVERNANCE',
              enabled: true,
              note: null,
              createdAt: '2026-06-24T00:00:00.000Z',
              updatedAt: '2026-06-24T00:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  getToggles() {
    return this.platformFeatureToggleService.getToggles();
  }

  @Patch()
  @ApiOperation({
    summary: 'Bulk update platform feature toggles',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: 'Platform feature toggles updated successfully',
        data: {
          toggles: [
            {
              key: 'EXTERNAL_NODE_API_ACCESS',
              label: 'External Node API Access',
              category: 'THIRD-PARTY PROVISIONING',
              enabled: false,
              note: null,
              createdAt: '2026-06-24T00:00:00.000Z',
              updatedAt: '2026-06-24T00:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  updateToggles(@Body() payload: UpdatePlatformFeatureTogglesDto) {
    return this.platformFeatureToggleService.updateToggles(payload);
  }
}
