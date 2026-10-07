import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { MarketplaceOverrideService } from 'src/modules/task/market-algoritm/marketplace-override.service';
import {
  CreateMarketplaceOverrideDto,
  RevokeMarketplaceOverrideDto,
  UpdateMarketplaceOverrideDto,
} from './dto/admin-marketplace-override.dto';

@ApiTags('Admin Marketplace Overrides')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller(['admin/marketplace-overrides', 'admin/marketplace/overrides'])
export class AdminMarketplaceOverrideController {
  constructor(private readonly overrideService: MarketplaceOverrideService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create a marketplace override (BOOST / SUPPRESS / FORCE_MATCH / SCORE_OVERRIDE / PENALTY) for a website',
  })
  create(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreateMarketplaceOverrideDto,
  ) {
    return this.overrideService.createOverride(adminId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List marketplace overrides (optionally by website)',
  })
  list(@Query('websiteId') websiteId?: string) {
    return this.overrideService.listOverrides(websiteId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing active marketplace override' })
  update(
    @CurrentUser('id') adminId: string,
    @Param('id') overrideId: string,
    @Body() dto: UpdateMarketplaceOverrideDto,
  ) {
    return this.overrideService.updateOverride(adminId, overrideId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a marketplace override' })
  revoke(
    @CurrentUser('id') adminId: string,
    @Param('id') overrideId: string,
    @Body() dto: RevokeMarketplaceOverrideDto,
  ) {
    return this.overrideService.revokeOverride(adminId, overrideId, dto.reason);
  }
}
