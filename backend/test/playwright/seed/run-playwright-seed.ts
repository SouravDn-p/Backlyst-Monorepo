import { execFileSync } from 'node:child_process';

import { seedMasterE2E } from './e2e-master-seed';

export function runPrismaMigrateDeploy() {
  const prismaExecutable = require.resolve('prisma/build/index.js');

  console.log('PLAYWRIGHT_SEED_MIGRATE=STARTED');

  execFileSync(
    process.execPath,
    [prismaExecutable, 'migrate', 'deploy', '--schema=prisma/schema'],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    },
  );

  console.log('PLAYWRIGHT_SEED_MIGRATE=PASS');
}

function printHelpfulSeedFailure(error: unknown) {
  if (
    error instanceof Error &&
    error.message.includes('invalid input value for enum "UserRole"')
  ) {
    console.error(
      [
        'PLAYWRIGHT_SEED_HINT=Database schema is behind the Prisma schema.',
        'The seed runner now applies `prisma migrate deploy` first.',
        'If this still fails, verify DATABASE_URL points to the intended local database and rerun.',
      ].join('\n'),
    );
  }
}

export async function runPlaywrightSeed() {
  runPrismaMigrateDeploy();
  await seedMasterE2E();
}

if (require.main === module) {
  runPlaywrightSeed().catch((error: unknown) => {
    printHelpfulSeedFailure(error);
    console.error(error);
    process.exitCode = 1;
  });
}
