import { spawnSync } from 'node:child_process';

const E2E_DATABASE_NAME = 'backlyst_marketplace_e2e';
const ALLOWED_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function resolveMarketplaceE2EEnvironment(
  sourceDatabaseUrl: string | undefined = process.env.DATABASE_URL,
): NodeJS.ProcessEnv {
  if (!sourceDatabaseUrl) {
    throw new Error(
      'Marketplace E2E startup refused: DATABASE_URL is missing.',
    );
  }

  let databaseUrl: URL;

  try {
    databaseUrl = new URL(sourceDatabaseUrl);
  } catch {
    throw new Error(
      'Marketplace E2E startup refused: DATABASE_URL is invalid.',
    );
  }

  if (!['postgresql:', 'postgres:'].includes(databaseUrl.protocol)) {
    throw new Error(
      `Marketplace E2E startup refused: unsupported database protocol "${databaseUrl.protocol}".`,
    );
  }

  if (!ALLOWED_DATABASE_HOSTS.has(databaseUrl.hostname)) {
    throw new Error(
      `Marketplace E2E startup refused: database host "${databaseUrl.hostname}" is not an approved local host.`,
    );
  }

  databaseUrl.pathname = `/${E2E_DATABASE_NAME}`;
  databaseUrl.searchParams.set('schema', 'public');

  return {
    ...process.env,
    NODE_ENV: 'test',
    ALLOW_E2E_DATABASE_RESET: 'true',
    ALLOW_E2E_DNS_RESOLUTION: 'true',
    E2E_DNS_LOOKUP_NAME: 'backlyst-verification.dns-owner-e2e.test',
    E2E_DNS_TXT_RECORD: 'backlyst-verification=e2e-dns-verification-token',
    ALLOW_E2E_META_TAG_FETCH: 'true',
    E2E_META_TAG_URL: 'https://meta-owner-e2e.test',
    E2E_META_TAG_HTML:
      '<html><head><meta name="backlyst-verification" content="e2e-dns-verification-token" /></head><body></body></html>',
    DATABASE_URL: databaseUrl.toString(),
    BACKEND_URL:
      process.env.MARKETPLACE_E2E_BACKEND_URL ?? 'http://localhost:5001',
  };
}

export function runMarketplaceE2E(): number {
  const environment = resolveMarketplaceE2EEnvironment();
  const resolvedDatabase = new URL(environment.DATABASE_URL as string);

  console.log(
    `MARKETPLACE_E2E_TARGET=${resolvedDatabase.hostname}:${resolvedDatabase.port || '5432'}${resolvedDatabase.pathname}?schema=${resolvedDatabase.searchParams.get('schema')}`,
  );
  console.log('MARKETPLACE_E2E_RUN=STARTED');

  const playwrightExecutable = require.resolve('@playwright/test/cli');
  const nodeExecutable = process.execPath;

  const result = spawnSync(
    nodeExecutable,
    [
      playwrightExecutable,
      'test',
      'test/e2e/marketplace-algorithm.api.spec.ts',
      '--project=api',
      ...process.argv.slice(2),
    ],
    {
      cwd: process.cwd(),
      env: environment,
      stdio: 'inherit',
    },
  );

  if (result.error) {
    throw result.error;
  }

  const exitCode = result.status ?? 1;

  if (exitCode === 0) {
    console.log('MARKETPLACE_E2E_RUN=PASS');
  } else {
    console.error(`MARKETPLACE_E2E_RUN=FAILED exitCode=${exitCode}`);
  }

  return exitCode;
}

if (require.main === module) {
  try {
    process.exitCode = runMarketplaceE2E();
  } catch (error: unknown) {
    console.error('MARKETPLACE_E2E_RUN=FAILED');

    console.error(error instanceof Error ? error.message : String(error));

    process.exitCode = 1;
  }
}
