import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  RootDomainNormalizer,
  SuffixLoader,
} from './root-domain-normalizer.util';

/**
 * NestJS wrapper around the shared `RootDomainNormalizer` (audit R2 / R14).
 *
 * Supplies a DB-backed loader for the two-part public-suffix list
 * (`PublicSuffixList` table) so root-domain normalization is data-driven rather
 * than hardcoded. The underlying normalizer keeps a 5-minute in-memory cache and
 * falls back to a static allowlist if the table is empty/unreachable, so
 * normalization never fails closed.
 *
 * The `warmCache()` call at bootstrap populates the cache before the first
 * request, avoiding a cold-cache DB hit on the hot validation path.
 */
@Injectable()
export class RootDomainNormalizerService
  extends RootDomainNormalizer
  implements OnModuleInit
{
  private readonly logger = new Logger(RootDomainNormalizerService.name);

  constructor(private readonly prisma: PrismaService) {
    const loader: SuffixLoader = async () => {
      const rows = await this.prisma.publicSuffixList.findMany({
        where: { isActive: true },
        select: { suffix: true },
      });
      return rows.map((r) => r.suffix);
    };
    super({ loadTwoPartSuffixes: loader, cacheTtlMs: 5 * 60 * 1000 });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.warmCache();
      this.logger.log('Root-domain suffix cache warmed from PublicSuffixList.');
    } catch (err) {
      this.logger.warn(
        `Root-domain suffix cache warm failed; using fallback list: ${(err as Error)?.message}`,
      );
    }
  }
}
