import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PatternFlagStatus, PatternFlagType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export type PatternFlagFilter = {
  status?: PatternFlagStatus;
  type?: PatternFlagType;
};

/**
 * Read/resolve access for `PatternFlag` rows (spec §14 coordinated-exchange
 * monitoring). Flags are produced by `PatternMonitorService`; this service only
 * lists and resolves them from the admin surface.
 */
@Injectable()
export class PatternFlagService {
  private readonly logger = new Logger(PatternFlagService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** List pattern flags ordered by most-recently created first. */
  async list(filter?: PatternFlagFilter) {
    const where: Prisma.PatternFlagWhereInput = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.type) where.type = filter.type;

    return this.prisma.patternFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Resolve a flag: mark RESOLVED, stamp resolvedAt + resolvedById, and merge an
   * optional note into `evidenceJson`. Throws NotFoundException if absent.
   */
  async resolve(id: string, adminId: string, note?: string) {
    const existing = await this.prisma.patternFlag.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`PatternFlag ${id} not found.`);
    }

    const mergedEvidence = this.mergeNote(existing.evidenceJson, note);

    const updated = await this.prisma.patternFlag.update({
      where: { id },
      data: {
        status: PatternFlagStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: adminId,
        ...(mergedEvidence !== undefined
          ? { evidenceJson: mergedEvidence }
          : {}),
      },
    });

    this.logger.log(`PatternFlag ${id} resolved by admin ${adminId}.`);
    return updated;
  }

  /** If a note is provided, merge it into the existing evidence JSON object. */
  private mergeNote(
    current: Prisma.PatternFlagGetPayload<null>['evidenceJson'],
    note?: string,
  ): Prisma.InputJsonValue | undefined {
    if (!note) return undefined;
    const base =
      current && typeof current === 'object' && !Array.isArray(current)
        ? { ...(current as Record<string, unknown>) }
        : {};
    return {
      ...base,
      resolutionNote: note,
    };
  }
}
