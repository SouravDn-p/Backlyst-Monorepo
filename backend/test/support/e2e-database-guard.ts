const REQUIRED_DATABASE_NAME = 'backlyst_marketplace_e2e';
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export interface SafeE2EDatabaseIdentity {
  host: string;
  port: string;
  database: string;
  schema: string;
}

export function assertSafeE2EDatabase(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
): SafeE2EDatabaseIdentity {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `E2E database operation refused: NODE_ENV must be "test", received "${process.env.NODE_ENV ?? 'undefined'}".`,
    );
  }

  if (process.env.ALLOW_E2E_DATABASE_RESET !== 'true') {
    throw new Error(
      'E2E database operation refused: ALLOW_E2E_DATABASE_RESET must equal "true".',
    );
  }

  if (!databaseUrl) {
    throw new Error(
      'E2E database operation refused: DATABASE_URL is missing.',
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      'E2E database operation refused: DATABASE_URL is invalid.',
    );
  }

  if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
    throw new Error(
      `E2E database operation refused: unsupported protocol "${parsed.protocol}".`,
    );
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const schema = parsed.searchParams.get('schema') || 'public';

  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error(
      `E2E database operation refused: host "${host}" is not an approved local host.`,
    );
  }

  if (database !== REQUIRED_DATABASE_NAME) {
    throw new Error(
      `E2E database operation refused: expected database "${REQUIRED_DATABASE_NAME}", received "${database}".`,
    );
  }

  if (schema !== 'public') {
    throw new Error(
      `E2E database operation refused: expected schema "public", received "${schema}".`,
    );
  }

  return {
    host,
    port,
    database,
    schema,
  };
}
