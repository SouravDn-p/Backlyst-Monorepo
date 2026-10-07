import { PrismaClient, UserRole, DirectTaskRequestStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data for test@backlyst.com...');
  
  const password = await bcrypt.hash('password123', 10);

  // Ensure test provider exists
  const provider = await prisma.user.upsert({
    where: { email: 'test@backlyst.com' },
    update: { status: 'ACTIVE', isVerified: true },
    create: {
      email: 'test@backlyst.com',
      name: 'Test Provider',
      password,
      role: UserRole.USER,
      isVerified: true,
      status: 'ACTIVE',
    },
  });

  await prisma.userCreditWallet.upsert({
    where: { userId: provider.id },
    update: {},
    create: { userId: provider.id, earnedTaskCredits: 0 },
  });

  const providerWebsite = await prisma.website.upsert({
    where: { websiteUrl: 'https://test-provider.com' },
    update: {},
    create: {
      name: 'Test Provider Site',
      websiteUrl: 'https://test-provider.com',
      industry: 'Technology',
      country: 'US',
      verificationStatus: 'VERIFIED',
      marketplaceVisibilityStatus: 'VISIBLE',
      authorId: provider.id,
      matchingProfile: {
        create: {
          userId: provider.id,
        },
      },
    },
  });

  // Ensure a requester exists
  const requester = await prisma.user.upsert({
    where: { email: 'test-requester@backlyst.com' },
    update: { status: 'ACTIVE', isVerified: true },
    create: {
      email: 'test-requester@backlyst.com',
      name: 'Test Requester',
      password,
      role: UserRole.USER,
      isVerified: true,
      status: 'ACTIVE',
    },
  });

  await prisma.userCreditWallet.upsert({
    where: { userId: requester.id },
    update: { earnedTaskCredits: 100 },
    create: { userId: requester.id, earnedTaskCredits: 100 },
  });

  const requesterWebsite = await prisma.website.upsert({
    where: { websiteUrl: 'https://test-requester.com' },
    update: {},
    create: {
      name: 'Test Requester Site',
      websiteUrl: 'https://test-requester.com',
      industry: 'Technology',
      country: 'US',
      verificationStatus: 'VERIFIED',
      marketplaceVisibilityStatus: 'VISIBLE',
      authorId: requester.id,
      matchingProfile: {
        create: {
          userId: requester.id,
        },
      },
    },
  });

  // Generate varied direct tasks targeting test@backlyst.com
  const tasksToCreate = [
    {
      status: DirectTaskRequestStatus.PENDING,
      title: 'Pending SEO Link Insertion',
      type: 'BACKLINK_INSERTION',
      cost: 1,
    },
    {
      status: DirectTaskRequestStatus.PENDING,
      title: 'Pending Guest Post - High Quality',
      type: 'GUEST_POST',
      cost: 2,
    },
    {
      status: DirectTaskRequestStatus.ACCEPTED,
      title: 'Accepted Niche Edit',
      type: 'BACKLINK_INSERTION',
      cost: 1,
    },
    {
      status: DirectTaskRequestStatus.REJECTED,
      title: 'Rejected Guest Post',
      type: 'GUEST_POST',
      cost: 2,
    },
    {
      status: DirectTaskRequestStatus.CANCELLED,
      title: 'Cancelled Flexible Campaign',
      type: 'FLEXIBLE',
      cost: 2,
    },
  ];

  for (const t of tasksToCreate) {
    await prisma.directTaskRequest.create({
      data: {
        requesterId: requester.id,
        requesterWebsiteId: requesterWebsite.id,
        targetProviderId: provider.id,
        projectTitle: t.title,
        targetUrl: 'https://test-requester.com/target-page',
        anchorText: 'test anchor',
        placementGuidelines: 'Please follow guidelines closely.',
        requiredDomainRating: 40,
        placementType: t.type as any,
        linkAttribute: 'DOFOLLOW',
        requestedDeadlineDays: 7,
        creditCost: t.cost,
        reservedCreditAmount: t.cost,
        walletType: 'SUBSCRIPTION',
        status: t.status,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Seeded direct tasks successfully for test@backlyst.com!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
