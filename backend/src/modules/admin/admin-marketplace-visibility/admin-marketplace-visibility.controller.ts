import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AdminMarketplaceVisibilityService } from './admin-marketplace-visibility.service';
import { AdminMarketplaceVisibilityQueryDto } from './dto/admin-marketplace-visibility-query.dto';

@ApiTags('Admin Marketplace Visibility')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/marketplace-visibility')
export class AdminMarketplaceVisibilityController {
  constructor(
    private readonly adminMarketplaceVisibilityService: AdminMarketplaceVisibilityService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get marketplace visibility list for verified websites',
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Marketplace visibility fetched successfully',
        data: {
          serverTime: '2026-06-25T10:39:30.009Z',
          items: [
            {
              website: {
                id: 'dd003f59-d309-4bc4-bbd3-f4a9020de46a',
                name: 'Backlink Test Site',
                websiteUrl: 'https://backlink-test-site.com',
                owner: {
                  id: 'fb063d05-e534-4336-9ae6-0c570701ead0',
                  name: 'Cyberdyne Systems',
                  email: 'owner@example.com',
                },
              },
              status: 'GRACE_PERIOD',
              compliance: 'COMPLIANT',
              usage: {
                credits: 11,
                label: '11 CR',
              },
              visibility: {
                credits: 0,
                activeUntil: null,
                graceStartedAt: '2026-06-25T10:39:00.009Z',
                graceEndsAt: '2026-06-25T10:41:00.009Z',
              },
              graceTimer: {
                endsAt: '2026-06-25T10:41:00.009Z',
                remainingSeconds: 120,
                serverTime: '2026-06-25T10:39:30.009Z',
                remainingTime: {
                  hours: 0,
                  minutes: 2,
                  seconds: 0,
                },
                label: '2m 0s',
              },
              authorityAction: {
                label: 'VIEW_PROFILE',
                websiteId: 'dd003f59-d309-4bc4-bbd3-f4a9020de46a',
              },
            },
          ],
          meta: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        },
      },
    },
  })
  getMarketplaceVisibility(@Query() query: AdminMarketplaceVisibilityQueryDto) {
    return this.adminMarketplaceVisibilityService.getMarketplaceVisibility(
      query,
    );
  }
}
