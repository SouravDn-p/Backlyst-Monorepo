import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.userReferral.findMany({
    include: {
      referrerUser: { select: { id: true, email: true, name: true } },
      referredUser: { select: { id: true, email: true, name: true } },
      referredWebsite: { select: { id: true, websiteUrl: true, name: true } },
      rewards: { select: { id: true, stage: true, referrerTaskCredits: true } },
    },
  });

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
