import axios from 'axios';

const MOZ_API_BASE_URL = 'https://lsapi.seomoz.com/v2';

const DEFAULT_MOZ_METRICS = [
  'domain_authority',
  'page_authority',
  'spam_score',
  'linking_root_domains',
  'root_domains_to_page',
  'ranking_keywords',
  'links',
] as const;

export interface MozDomainStatsOptions {
  accessId?: string;
  secretKey?: string;
  timeoutMs?: number;
  metrics?: readonly string[];
  dailyHistoryValues?: readonly string[];
  dailyHistoryDeltas?: readonly string[];
  monthlyHistoryValues?: readonly string[];
  monthlyHistoryDeltas?: readonly string[];
  distributions?: boolean;
}

export interface MozDomainStatsResponse {
  domain: string;
  normalizedDomain: string;
  metrics: Record<string, unknown>;
  analytics: {
    backlink: {
      totalBacklinks: number;
      externalBacklinks: number;
      totalRefDomains: number;
      dofollowRefDomains: number;
      nofollowRefDomains: number;
      backlinkQualityRatio: number | null;
      dofollowRefDomainRatio: number | null;
    };
    guestPost: {
      domainAuthority: number | null;
      pageAuthority: number | null;
      spamScore: number | null;
      estimatedGuestPostSuitability: 'HIGH' | 'MEDIUM' | 'LOW';
    };
  };
  raw: unknown;
}

export interface MozBulkDomainStatsResponse {
  domains: string[];
  normalizedDomains: string[];
  results: Array<
    Record<string, unknown> & {
      analytics: MozDomainStatsResponse['analytics'];
    }
  >;
  raw: unknown;
}

function normalizeDomain(domain: string): string {
  const value = domain.trim();
  if (!value) {
    throw new Error('Domain is required');
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const parsed = new URL(withProtocol);

  return parsed.hostname.toLowerCase();
}

function buildBasicAuth(accessId: string, secretKey: string): string {
  const credential = `${accessId}:${secretKey}`;
  return Buffer.from(credential).toString('base64');
}

function resolveCredentials(options?: MozDomainStatsOptions) {
  const accessId = options?.accessId ?? process.env.MOZ_ACCESS_ID;
  const secretKey = options?.secretKey ?? process.env.MOZ_SECRET_KEY;

  if (!accessId || !secretKey) {
    throw new Error(
      'Missing MOZ credentials. Set MOZ_ACCESS_ID and MOZ_SECRET_KEY.',
    );
  }

  return { accessId, secretKey };
}

function buildRequestPayload(
  targets: string[],
  options?: MozDomainStatsOptions,
): Record<string, unknown> {
  const metrics = options?.metrics?.length
    ? [...options.metrics]
    : [...DEFAULT_MOZ_METRICS];

  const payload: Record<string, unknown> = {
    targets,
    metrics,
  };

  if (options?.dailyHistoryValues?.length) {
    payload.daily_history_values = [...options.dailyHistoryValues];
  }
  if (options?.dailyHistoryDeltas?.length) {
    payload.daily_history_deltas = [...options.dailyHistoryDeltas];
  }
  if (options?.monthlyHistoryValues?.length) {
    payload.monthly_history_values = [...options.monthlyHistoryValues];
  }
  if (options?.monthlyHistoryDeltas?.length) {
    payload.monthly_history_deltas = [...options.monthlyHistoryDeltas];
  }
  if (typeof options?.distributions === 'boolean') {
    payload.distributions = options.distributions;
  }

  return payload;
}

async function callMozUrlMetrics(
  targets: string[],
  options?: MozDomainStatsOptions,
) {
  const { accessId, secretKey } = resolveCredentials(options);
  const payload = buildRequestPayload(targets, options);

  const { data } = await axios.post(
    `${MOZ_API_BASE_URL}/url_metrics`,
    payload,
    {
      timeout: options?.timeoutMs ?? 15_000,
      headers: {
        Authorization: `Basic ${buildBasicAuth(accessId, secretKey)}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return data;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function ratioOrNull(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Number((numerator / denominator).toFixed(4));
}

function buildBacklinkGuestPostAnalytics(metrics: Record<string, unknown>) {
  const totalBacklinks = toNumber(metrics.pages_to_root_domain);
  const externalBacklinks = toNumber(metrics.external_pages_to_root_domain);
  const totalRefDomains = toNumber(metrics.root_domains_to_root_domain);
  const nofollowRefDomains = toNumber(
    metrics.nofollow_root_domains_to_root_domain,
  );
  const dofollowRefDomains = Math.max(totalRefDomains - nofollowRefDomains, 0);
  const domainAuthorityRaw = metrics.domain_authority;
  const pageAuthorityRaw = metrics.page_authority;
  const spamScoreRaw = metrics.spam_score;
  const domainAuthority =
    typeof domainAuthorityRaw === 'number' ? domainAuthorityRaw : null;
  const pageAuthority =
    typeof pageAuthorityRaw === 'number' ? pageAuthorityRaw : null;
  const spamScore = typeof spamScoreRaw === 'number' ? spamScoreRaw : null;

  let estimatedGuestPostSuitability: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (
    domainAuthority !== null &&
    spamScore !== null &&
    domainAuthority >= 40 &&
    spamScore <= 4
  ) {
    estimatedGuestPostSuitability = 'HIGH';
  } else if (
    domainAuthority !== null &&
    spamScore !== null &&
    domainAuthority >= 25 &&
    spamScore <= 8
  ) {
    estimatedGuestPostSuitability = 'MEDIUM';
  }

  return {
    backlink: {
      totalBacklinks,
      externalBacklinks,
      totalRefDomains,
      dofollowRefDomains,
      nofollowRefDomains,
      backlinkQualityRatio: ratioOrNull(externalBacklinks, totalBacklinks),
      dofollowRefDomainRatio: ratioOrNull(dofollowRefDomains, totalRefDomains),
    },
    guestPost: {
      domainAuthority,
      pageAuthority,
      spamScore,
      estimatedGuestPostSuitability,
    },
  };
}

export async function getMozDomainStats(
  domain: string,
  options?: MozDomainStatsOptions,
): Promise<MozDomainStatsResponse> {
  const normalizedDomain = normalizeDomain(domain);
  const data = await callMozUrlMetrics([normalizedDomain], options);

  const firstRow = Array.isArray(data?.results) ? data.results[0] : undefined;

  return {
    domain,
    normalizedDomain,
    metrics: (firstRow ?? {}) as Record<string, unknown>,
    analytics: buildBacklinkGuestPostAnalytics(
      (firstRow ?? {}) as Record<string, unknown>,
    ),
    raw: data,
  };
}

export async function getMozDomainStatsBulk(
  domains: string[],
  options?: MozDomainStatsOptions,
): Promise<MozBulkDomainStatsResponse> {
  if (!Array.isArray(domains) || domains.length === 0) {
    throw new Error('At least one domain is required');
  }

  const normalizedDomains = domains.map((domain) => normalizeDomain(domain));
  const data = await callMozUrlMetrics(normalizedDomains, options);
  const results = Array.isArray(data?.results)
    ? (data.results as Array<Record<string, unknown>>).map((item) => ({
        ...item,
        analytics: buildBacklinkGuestPostAnalytics(item),
      }))
    : [];

  return {
    domains,
    normalizedDomains,
    results,
    raw: data,
  };
}
