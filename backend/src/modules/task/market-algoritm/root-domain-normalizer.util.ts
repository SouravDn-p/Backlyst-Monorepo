/**
 * Shared root-domain normalization (spec §8 / §9).
 *
 * Single source of truth for collapsing a raw domain / website URL into its
 * marketplace root domain (2-label root, with a 2-part public-suffix allowlist
 * for ccTLDs like co.uk). Previously duplicated in BOTH `ValidationEngine` and
 * `AdminDomainPairInspectionService` ("Kept in sync" comment — a drift risk per
 * the Domain Relationship Tracking audit §3). Both callers now import this util.
 *
 * Audit R2 / R14 (2026-07-18): the two-part public-suffix allowlist is now
 * DATA-DRIVEN. `RootDomainNormalizer` loads active suffixes from the
 * `PublicSuffixList` table at startup (with an in-memory cache + TTL) so adding
 * a new ccTLD (e.g. com.mx, co.za) no longer requires a code deploy. A static
 * FALLBACK list is retained so normalization still works before the cache is
 * warm or if the table is unreachable.
 */

/**
 * Fallback two-part public suffixes (mirrors the seeded `PublicSuffixList`
 * rows). Used only when the DB-backed cache is empty/unavailable so domain
 * normalization never fails closed.
 */
const FALLBACK_TWO_PART_PUBLIC_SUFFIXES = new Set([
  'ac.uk',
  'co.bd',
  'co.in',
  'co.jp',
  'co.nz',
  'co.uk',
  'com.au',
  'com.bd',
  'com.br',
  'com.cn',
  'com.sg',
  'gov.uk',
  'net.au',
  'org.uk',
]);

/**
 * Loader contract so this util stays decoupled from Prisma. The NestJS
 * `RootDomainNormalizer` service supplies a `loadTwoPartSuffixes` that reads
 * `PublicSuffixList` (active rows only). Pure callers (specs) may omit it and
 * get the static fallback set.
 */
export type SuffixLoader = () => Promise<string[]>;

interface NormalizerOptions {
  /** Async loader for DB-backed two-part suffixes. Omit to use the fallback set. */
  loadTwoPartSuffixes?: SuffixLoader;
  /** Cache TTL in ms (default 5 min). */
  cacheTtlMs?: number;
}

class RootDomainNormalizer {
  private readonly fallback = FALLBACK_TWO_PART_PUBLIC_SUFFIXES;
  private readonly loader?: SuffixLoader;
  private readonly cacheTtlMs: number;

  private cache: Set<string> | null = null;
  private cacheLoadedAt = 0;
  // Guards against concurrent refreshes (thundering herd on cold cache).
  private refreshPromise: Promise<Set<string>> | null = null;

  constructor(opts: NormalizerOptions = {}) {
    this.loader = opts.loadTwoPartSuffixes;
    this.cacheTtlMs = opts.cacheTtlMs ?? 5 * 60 * 1000;
  }

  /** Returns the live two-part suffix set, refreshing the cache if stale. */
  private async getTwoPartSuffixes(): Promise<Set<string>> {
    const now = Date.now();
    if (this.cache && now - this.cacheLoadedAt < this.cacheTtlMs) {
      return this.cache;
    }
    if (!this.loader) {
      // No DB loader configured -> static fallback (no caching needed).
      return this.fallback;
    }
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const rows = await this.loader!();
        const next = new Set<string>(
          rows.map((s) => s.trim().toLowerCase()).filter(Boolean),
        );
        if (next.size > 0) {
          this.cache = next;
          this.cacheLoadedAt = Date.now();
          return next;
        }
        // Empty table -> fall back so normalization is never degraded.
        return this.fallback;
      } catch {
        // Loader failure must not break normalization; use the fallback set.
        return this.fallback;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /** Synchronous normalization using the currently-cached (or fallback) set. */
  normalizeRootDomainSync(value: string | null | undefined): string {
    return normalizeWithSuffixes(value, this.cache ?? this.fallback);
  }

  /** Async normalization that ensures the cache is fresh before normalizing. */
  async normalizeRootDomain(value: string | null | undefined): Promise<string> {
    const suffixes = await this.getTwoPartSuffixes();
    return normalizeWithSuffixes(value, suffixes);
  }

  /** Builds the normalized ordered/sorted pair keys against the cached set. */
  buildPairKey(domainA: string, domainB: string): string {
    return [
      this.normalizeRootDomainSync(domainA),
      this.normalizeRootDomainSync(domainB),
    ]
      .sort()
      .join('_');
  }

  buildOrderedPairKey(sourceDomain: string, targetDomain: string): string {
    return [
      this.normalizeRootDomainSync(sourceDomain),
      this.normalizeRootDomainSync(targetDomain),
    ].join('__');
  }

  /** Warms the cache (call at app bootstrap). Safe to await; never throws. */
  async warmCache(): Promise<void> {
    if (this.loader) {
      try {
        await this.getTwoPartSuffixes();
      } catch {
        /* best-effort */
      }
    }
  }
}

/** Pure normalization given an explicit two-part suffix set. */
function normalizeWithSuffixes(
  value: string | null | undefined,
  twoPartSuffixes: Set<string>,
): string {
  if (!value) return '';
  const rawValue = value.trim().toLowerCase();
  if (!rawValue) return '';

  let hostname = rawValue;
  try {
    const normalizedUrl = /^https?:\/\//i.test(rawValue)
      ? rawValue
      : `https://${rawValue}`;
    hostname = new URL(normalizedUrl).hostname.toLowerCase();
  } catch {
    hostname = rawValue
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .split('?')[0]
      .split('#')[0]
      .toLowerCase();
  }

  hostname = hostname.replace(/^www\./, '').replace(/\.$/, '');
  const labels = hostname.split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');

  const suffix = labels.slice(-2).join('.');
  if (twoPartSuffixes.has(suffix) && labels.length >= 3) {
    return labels.slice(-3).join('.');
  }

  return labels.slice(-2).join('.');
}

// ---- Module-level default instance (static fallback only) ----
// Used by callers that import the plain functions (specs / non-DI code paths).
// When the DI `RootDomainNormalizer` service is available it is preferred so the
// data-driven suffix list is honoured.
const defaultNormalizer = new RootDomainNormalizer();

export function normalizeRootDomain(value: string | null | undefined): string {
  return defaultNormalizer.normalizeRootDomainSync(value);
}

export function buildPairKey(domainA: string, domainB: string): string {
  return defaultNormalizer.buildPairKey(domainA, domainB);
}

/**
 * Ordered (direction-preserving) pair key: source -> target. Distinguishes
 * A->B from B->A so reciprocal (reverse-direction) interactions can be tracked
 * separately from repeats (same-direction) of the same domain pair (spec §9).
 */
export function buildOrderedPairKey(
  sourceDomain: string,
  targetDomain: string,
): string {
  return defaultNormalizer.buildOrderedPairKey(sourceDomain, targetDomain);
}

export { RootDomainNormalizer };
