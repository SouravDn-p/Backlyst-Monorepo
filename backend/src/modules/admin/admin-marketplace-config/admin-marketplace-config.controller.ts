import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminMarketplaceConfigService } from './admin-marketplace-config.service';
import { UpdateScoringConfigDto } from './dto/update-scoring-config.dto';

@ApiTags('Admin Marketplace Config')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller(['admin/marketplace-config', 'admin/marketplace/scoring-config'])
export class AdminMarketplaceConfigController {
  constructor(
    private readonly adminMarketplaceConfigService: AdminMarketplaceConfigService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get current marketplace scoring / cooldown configuration',
  })
  @ApiOkResponse({
    description: 'Marketplace scoring config',
  })
  getConfig() {
    return this.adminMarketplaceConfigService.getConfig();
  }

  @Patch()
  @ApiOperation({
    summary:
      'Update marketplace scoring / cooldown configuration (cooldown windows, weights, relaxation, daily caps)',
  })
  @ApiOkResponse({
    description: 'Updated marketplace scoring config',
  })
  updateConfig(
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateScoringConfigDto,
  ) {
    return this.adminMarketplaceConfigService.updateConfig(adminId, dto);
  }
}
