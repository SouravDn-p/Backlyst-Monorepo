import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data for Direct Task testing...');
  const password = await bcrypt.hash('password123', 10);

  // 1. Create Requester User
  const requester = await prisma.user.upsert({
    where: { email: 'requester@direct.com' },
    update: { status: 'ACTIVE', isVerified: true },
    create: {
      email: 'requester@direct.com',
      name: 'Direct Requester',
      password,
      role: UserRole.USER,
      isVerified: true,
      status: 'ACTIVE',
    },
  });

  await prisma.userCreditWallet.upsert({
    where: { userId: requester.id },
    update: { earnedTaskCredits: 10 },
    create: { userId: requester.id, earnedTaskCredits: 10 },
  });

  const requesterWebsite = await prisma.website.upsert({
    where: { websiteUrl: 'https://requester-test.com' },
    update: {},
    create: {
      name: 'Requester Test Site',
      websiteUrl: 'https://requester-test.com',
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

  await prisma.websiteCreditWallet.upsert({
    where: { websiteId: requesterWebsite.id },
    update: { earnedTaskCredits: 10 },
    create: { websiteId: requesterWebsite.id, earnedTaskCredits: 10 },
  });

  // 2. Create Provider User
  const provider = await prisma.user.upsert({
    where: { email: 'provider@direct.com' },
    update: { status: 'ACTIVE', isVerified: true },
    create: {
      email: 'provider@direct.com',
      name: 'Direct Provider',
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
    where: { websiteUrl: 'https://provider-test.com' },
    update: {},
    create: {
      name: 'Provider Test Site',
      websiteUrl: 'https://provider-test.com',
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

  await prisma.websiteCreditWallet.upsert({
    where: { websiteId: providerWebsite.id },
    update: {},
    create: { websiteId: providerWebsite.id, earnedTaskCredits: 0 },
  });

  console.log('✅ Seed completed successfully!');
  console.log('-----------------------------------');
  console.log(`[Requester] Email: ${requester.email}`);
  console.log(`[Requester] Website ID: ${requesterWebsite.id}`);
  console.log('-----------------------------------');
  console.log(`[Provider] Email: ${provider.email}`);
  console.log(`[Provider] User ID: ${provider.id}`);
  console.log(`[Provider] Website ID: ${providerWebsite.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
