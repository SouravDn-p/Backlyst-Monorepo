import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

import { seedMarketplaceTestData } from './marketplace-seed';
import { assertSafeE2EDatabase } from './support/e2e-database-guard';

export async function resetAndSeedMarketplaceE2E(): Promise<void> {
  const database = assertSafeE2EDatabase();

  console.log(
    `E2E_RESET_TARGET=${database.host}:${database.port}/${database.database}?schema=${database.schema}`,
  );

  const prismaExecutable = require.resolve('prisma/build/index.js');
  const nodeExecutable = process.execPath;

  console.log('E2E_DATABASE_RESET=STARTED');

  execFileSync(
    nodeExecutable,
    [prismaExecutable, 'migrate', 'reset', '--force', '--skip-seed'],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    },
  );

  console.log('E2E_DATABASE_RESET=PASS');

  const prisma = new PrismaClient();

  try {
    await seedMarketplaceTestData(prisma);
    console.log('E2E_DATABASE_SEED=PASS');
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  await resetAndSeedMarketplaceE2E();
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('E2E_RESET_AND_SEED=FAILED');
    console.error(error);
    process.exitCode = 1;
  });
}
