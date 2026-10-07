import { PrismaClient } from '@prisma/client';
import { DomainInteractionRecorderService } from './domain-interaction-recorder.service';
import { ValidationEngine } from './validation.engine';

async function main() {
  const prisma = new PrismaClient();
  await prisma.$connect();
  
  const mockValidationEngine = {
    validateTransition: (input: any) => {
      if (input.dailyMatches >= 1) {
        return Promise.resolve({ decision: 'REJECTED', publicMessage: 'Limit reached', rulesFailed: ['DAILY_LIMIT'], rulesPassed: [], context: input.stage });
      }
      return Promise.resolve({ decision: 'APPROVED', publicMessage: 'OK', rulesFailed: [], rulesPassed: [], context: input.stage });
    }
  } as unknown as ValidationEngine;

  const service = new DomainInteractionRecorderService(mockValidationEngine);

  const providerDomain = `provider-${Date.now()}.com`;
  
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: 'Test',
    }
  });

  const provider = await prisma.website.create({
    data: {
      websiteUrl: `https://${providerDomain}`,
      rootDomain: providerDomain,
      name: 'Concurrency Test',
      authorId: user.id,
      industry: 'TEST',
      country: 'US',
    }
  });

  let successCount = 0;
  let failCount = 0;

  const runRequest = async (index: number) => {
    try {
      await prisma.$transaction(async (tx) => {
        await service.validateAndRecord(
          tx,
          {
            taskId: `task-${Date.now()}-${index}`,
            requesterWebsiteId: `req-${index}`,
            providerWebsiteId: provider.id,
            completedAt: new Date(),
          },
          {
            stage: 'APPROVE',
            actorUserId: user.id,
            providerDomain,
            requesterDomain: `req-${index}.com`,
            dailyMatches: 0,
            maxProviderMatchesPerDay: 1,
          }
        );
        
        await (tx as any).placementTask.create({
          data: {
            id: `task-${Date.now()}-${index}`,
            status: 'COMPLETED',
            requesterWebsiteId: `req-${index}`,
            assignedProviderWebsiteId: provider.id,
            assignedAt: new Date(),
          }
        });
      });
      successCount++;
    } catch {
      failCount++;
    }
  };

  const promises = Array.from({ length: 10 }).map((_, i) => runRequest(i));
  await Promise.all(promises);

  console.log(`Successes: ${successCount}`);
  console.log(`Failures: ${failCount}`);

  if (successCount === 1 && failCount === 9) {
    console.log('CONCURRENCY TEST PASSED');
  } else {
    console.log('CONCURRENCY TEST FAILED');
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
