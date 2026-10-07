import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { disconnectSeedPrisma, runSeed } from '../../../prisma/seed';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);
  private hasRun = false;

  async onApplicationBootstrap() {
    const shouldAutoSeed =
      String(process.env.AUTO_SEED_ON_START ?? 'false').toLowerCase() ===
      'true';

    if (!shouldAutoSeed) {
      this.logger.log(
        'Skipping startup seed because AUTO_SEED_ON_START is not enabled.',
      );
      return;
    }

    if (this.hasRun) {
      return;
    }

    this.hasRun = true;
    this.logger.log('Running startup seed...');

    try {
      await runSeed();
      this.logger.log('Startup seed completed.');
    } catch (error) {
      this.logger.error(
        `Startup seed failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      await disconnectSeedPrisma();
    }
  }

}
