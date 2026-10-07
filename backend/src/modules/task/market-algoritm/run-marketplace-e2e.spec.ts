import { resolveMarketplaceE2EEnvironment } from '../../../../test/run-marketplace-e2e';

describe('Marketplace E2E Runner Helper', () => {
  it('throws if DATABASE_URL is missing', () => {
    expect(() => resolveMarketplaceE2EEnvironment(undefined)).toThrow(/DATABASE_URL is missing/);
  });

  it('throws if DATABASE_URL is invalid', () => {
    expect(() => resolveMarketplaceE2EEnvironment('not-a-url')).toThrow(/DATABASE_URL is invalid/);
  });

  it('throws if database protocol is not postgres', () => {
    expect(() => resolveMarketplaceE2EEnvironment('mysql://localhost')).toThrow(/unsupported database protocol/);
  });

  it('throws if database host is not local', () => {
    expect(() => resolveMarketplaceE2EEnvironment('postgresql://remote.host')).toThrow(/not an approved local host/);
  });

  it('resolves correct environment overrides', () => {
    const env = resolveMarketplaceE2EEnvironment('postgresql://localhost:5432/original_db');
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/backlyst_marketplace_e2e?schema=public');
    expect(env.NODE_ENV).toBe('test');
    expect(env.ALLOW_E2E_DATABASE_RESET).toBe('true');
  });
});
