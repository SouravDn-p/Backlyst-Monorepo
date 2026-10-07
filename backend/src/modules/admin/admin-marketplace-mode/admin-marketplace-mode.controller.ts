import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminMarketplaceModeService } from './admin-marketplace-mode.service';
import { SetMarketplaceModeDto } from './dto/admin-marketplace-mode.dto';

@ApiTags('Admin Marketplace Mode')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/marketplace-mode')
export class AdminMarketplaceModeController {
  constructor(
    private readonly adminMarketplaceModeService: AdminMarketplaceModeService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get current marketplace mode config (EARLY_STAGE / SCALING)',
  })
  @ApiOkResponse({
    description: 'Marketplace mode config',
  })
  getConfig() {
    return this.adminMarketplaceModeService.getConfig();
  }

  @Put()
  @ApiOperation({
    summary:
      'Set marketplace mode and optional preset overrides (relaxation / velocity caps). When SCALING, the preset drives MatchingEngine relaxation.',
  })
  @ApiOkResponse({
    description: 'Updated marketplace mode config',
  })
  setMode(
    @CurrentUser('id') adminId: string,
    @Body() dto: SetMarketplaceModeDto,
  ) {
    return this.adminMarketplaceModeService.setMode(
      adminId,
      dto.mode,
      dto.preset,
    );
  }
}
