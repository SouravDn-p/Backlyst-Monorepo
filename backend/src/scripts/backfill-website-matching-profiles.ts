import { PrismaClient, WebsiteVerificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const websites = await prisma.website.findMany({
    where: {
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
      isDeleted: false,
    },
    select: {
      id: true,
      authorId: true,
      name: true,
      websiteUrl: true,
    },
  });

  for (const website of websites) {
    await prisma.websiteMatchingProfile.upsert({
      where: { websiteId: website.id },
      update: {},
      create: {
        websiteId: website.id,
        userId: website.authorId,
        visibilityScore: 50,
        opportunityScore: 50,
        reputationScore: 50,
        internalPriorityScore: 50,
        reliabilityScore: 50,
        riskScore: 0,
        diversityScore: 50,
        firstSuccessBoostActive: true,
      },
    });
  }

  console.log(`Processed ${websites.length} verified websites`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
