import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  CreateNicheCapDto,
  ListNicheCapQueryDto,
  NicheCapScope,
  UpdateNicheCapDto,
} from './dto/admin-niche-cap.dto';

/**
 * Spec §12: admin CRUD for `NicheDistributionCap` rows, which are consumed by
 * `DistributionEngine.isNicheWithinCap` and validation LEVEL 5. Behind the
 * AdminGuard (controller). No new DB model required — the model already exists.
 */
@Injectable()
export class AdminNicheCapService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListNicheCapQueryDto) {
    const where: Prisma.NicheDistributionCapWhereInput = {};
    if (query.scope) where.scope = query.scope;
    if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

    const caps = await this.prisma.nicheDistributionCap.findMany({
      where,
      orderBy: [{ scope: 'asc' }, { categoryKey: 'asc' }],
    });

    return sendResponse('Niche distribution caps fetched successfully', caps);
  }

  async create(dto: CreateNicheCapDto) {
    // Validate that categoryKey references a real MarketplaceCategory.
    const category = await this.prisma.marketplaceCategory.findUnique({
      where: { id: dto.categoryKey },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException(
        'MarketplaceCategory not found for categoryKey.',
      );
    }

    const scope = dto.scope ?? NicheCapScope.PRIMARY;
    const cap = await this.prisma.nicheDistributionCap.create({
      data: {
        categoryKey: dto.categoryKey,
        scope,
        maxPerWindow: dto.maxPerWindow,
        windowDays: dto.windowDays ?? 7,
        note: dto.note ?? null,
      },
    });

    return sendResponse('Niche distribution cap created successfully', cap);
  }

  async update(id: string, dto: UpdateNicheCapDto) {
    const existing = await this.prisma.nicheDistributionCap.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Niche distribution cap not found.');
    }

    const cap = await this.prisma.nicheDistributionCap.update({
      where: { id },
      data: {
        ...(typeof dto.maxPerWindow === 'number'
          ? { maxPerWindow: dto.maxPerWindow }
          : {}),
        ...(typeof dto.windowDays === 'number'
          ? { windowDays: dto.windowDays }
          : {}),
        ...(typeof dto.isActive === 'boolean'
          ? { isActive: dto.isActive }
          : {}),
        ...(typeof dto.note === 'string' ? { note: dto.note } : {}),
      },
    });

    return sendResponse('Niche distribution cap updated successfully', cap);
  }

  /**
   * Soft delete: sets `isActive = false` rather than removing the row so
   * historical cap evaluations remain auditable (spec §12).
   */
  async remove(id: string) {
    const existing = await this.prisma.nicheDistributionCap.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Niche distribution cap not found.');
    }

    const cap = await this.prisma.nicheDistributionCap.update({
      where: { id },
      data: { isActive: false },
    });

    return sendResponse('Niche distribution cap deactivated successfully', cap);
  }
}
