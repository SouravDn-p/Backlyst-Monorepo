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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AdminNicheCapService } from './admin-niche-cap.service';
import {
  CreateNicheCapDto,
  ListNicheCapQueryDto,
  UpdateNicheCapDto,
} from './dto/admin-niche-cap.dto';

@ApiTags('Admin Niche Distribution Caps')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/niche-caps')
export class AdminNicheCapController {
  constructor(private readonly adminNicheCapService: AdminNicheCapService) {}

  @Get()
  @ApiOperation({
    summary: 'List niche distribution caps (filter by scope / isActive)',
  })
  @ApiOkResponse({ description: 'List of niche distribution caps' })
  list(@Query() query: ListNicheCapQueryDto) {
    return this.adminNicheCapService.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a niche distribution cap (spec §12)',
  })
  @ApiOkResponse({ description: 'Created niche distribution cap' })
  create(@Body() dto: CreateNicheCapDto) {
    return this.adminNicheCapService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a niche distribution cap (maxPerWindow / windowDays / isActive / note)',
  })
  @ApiOkResponse({ description: 'Updated niche distribution cap' })
  update(@Param('id') id: string, @Body() dto: UpdateNicheCapDto) {
    return this.adminNicheCapService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft-delete a niche distribution cap (sets isActive = false)',
  })
  @ApiOkResponse({ description: 'Deactivated niche distribution cap' })
  remove(@Param('id') id: string) {
    return this.adminNicheCapService.remove(id);
  }
}
