import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { MarketplaceModeValue } from './dto/admin-marketplace-mode.dto';
import { MarketplaceConfigService } from 'src/modules/task/market-algoritm/marketplace-config.service';

const CONFIG_ID = 'MARKETPLACE_MODE_CONFIG';

@Injectable()
export class AdminMarketplaceModeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketplaceConfigService: MarketplaceConfigService,
  ) {}

  /**
   * Read the singleton marketplace-mode config row, seeding the default
   * (EARLY_STAGE) row if it has never been written.
   */
  async getConfig() {
    let config = await this.prisma.marketplaceModeConfig.findUnique({
      where: { id: CONFIG_ID },
    });

    if (!config) {
      config = await this.prisma.marketplaceModeConfig.upsert({
        where: { id: CONFIG_ID },
        create: {
          id: CONFIG_ID,
          mode: 'EARLY_STAGE',
          isActive: true,
        },
        update: {},
      });
    }

    return sendResponse('Marketplace mode config fetched successfully', config);
  }

  /**
   * Upsert the singleton marketplace-mode config.
   *
   * `adminId` is persisted on `MarketplaceModeConfig.updatedById` for audit
   * traceability (spec §28).
   */
  async setMode(
    adminId: string,
    mode: MarketplaceModeValue,
    preset?: Record<string, unknown>,
  ) {
    const config = await this.prisma.marketplaceModeConfig.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        mode,
        isActive: true,
        updatedById: adminId,
        preset: (preset ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      update: {
        mode,
        isActive: true,
        updatedById: adminId,
        preset: (preset ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    await this.marketplaceConfigService.invalidateConfigCache().catch(() => {});

    return sendResponse('Marketplace mode updated successfully', config);
  }
}
