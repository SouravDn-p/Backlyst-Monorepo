import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedTaskRequestE2E() {
  console.log('🌱 Seeding E2E test data for /task-request flow...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create or update Requester
  const requester = await prisma.user.upsert({
    where: { email: 'requester@e2e.com' },
    create: {
      name: 'Requester E2E Test',
      email: 'requester@e2e.com',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      status: UserStatus.ACTIVE,
      registrationTime: new Date(),
    },
    update: {
      password: passwordHash,
      isVerified: true,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    },
  });

  // 2. Create or update Provider
  const provider = await prisma.user.upsert({
    where: { email: 'provider@e2e.com' },
    create: {
      name: 'Provider E2E Test',
      email: 'provider@e2e.com',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      status: UserStatus.ACTIVE,
      registrationTime: new Date(),
    },
    update: {
      password: passwordHash,
      isVerified: true,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    },
  });

  // 3. Ensure User Master Wallets
  await prisma.userCreditWallet.upsert({
    where: { userId: requester.id },
    create: { userId: requester.id, earnedTaskCredits: 0, visibilityCredits: 0 },
    update: {},
  });
  await prisma.userCreditWallet.upsert({
    where: { userId: provider.id },
    create: { userId: provider.id, earnedTaskCredits: 0, visibilityCredits: 0 },
    update: {},
  });

  // 4. Create Requester Website
  const requesterWebsite = await prisma.website.upsert({
    where: { websiteUrl: 'https://requester-e2e-site.com' },
    create: {
      name: 'Requester E2E Site',
      authorId: requester.id,
      websiteUrl: 'https://requester-e2e-site.com',
      industry: 'Technology',
      country: 'US',
      verificationStatus: 'VERIFIED',
      marketplaceVisibilityStatus: 'VISIBLE',
    },
    update: {
      authorId: requester.id,
      verificationStatus: 'VERIFIED',
      marketplaceVisibilityStatus: 'VISIBLE',
    },
  });

  // 5. Create Provider Website
  const providerWebsite = await prisma.website.upsert({
    where: { websiteUrl: 'https://provider-e2e-site.com' },
    create: {
      name: 'Provider E2E Site',
      authorId: provider.id,
      websiteUrl: 'https://provider-e2e-site.com',
      industry: 'Media',
      country: 'US',
      verificationStatus: 'VERIFIED',
      marketplaceVisibilityStatus: 'VISIBLE',
    },
    update: {
      authorId: provider.id,
      verificationStatus: 'VERIFIED',
      marketplaceVisibilityStatus: 'VISIBLE',
    },
  });

  // 6. Ensure Website Credit Wallets with credits
  await prisma.websiteCreditWallet.upsert({
    where: { websiteId: requesterWebsite.id },
    create: {
      websiteId: requesterWebsite.id,
      subscriptionTaskCredits: 20,
      allocatedPurchasedCredits: 20,
      allocatedReferralCredits: 20,
      earnedTaskCredits: 0,
    },
    update: {
      subscriptionTaskCredits: 20,
      allocatedPurchasedCredits: 20,
      allocatedReferralCredits: 20,
    },
  });

  await prisma.websiteCreditWallet.upsert({
    where: { websiteId: providerWebsite.id },
    create: {
      websiteId: providerWebsite.id,
      subscriptionTaskCredits: 10,
      allocatedPurchasedCredits: 0,
      allocatedReferralCredits: 0,
      earnedTaskCredits: 5,
    },
    update: {},
  });

  console.log('\n======================================================');
  console.log('✅ E2E Seed Completed Successfully!');
  console.log('======================================================');
  console.log('👥 Requester Account:');
  console.log(`   Email:                  requester@e2e.com`);
  console.log(`   Password:               password123`);
  console.log(`   User ID:                ${requester.id}`);
  console.log(`   requesterWebsiteId:     ${requesterWebsite.id}`);
  console.log(`   Website URL:            https://requester-e2e-site.com`);
  console.log(`   Website Wallet:         20 Subscription Credits`);
  console.log('\n👥 Provider Account:');
  console.log(`   Email:                  provider@e2e.com`);
  console.log(`   Password:               password123`);
  console.log(`   targetProviderId:       ${provider.id}`);
  console.log(`   targetProviderWebsiteId:${providerWebsite.id}`);
  console.log(`   Website URL:            https://provider-e2e-site.com`);
  console.log('======================================================\n');
}

seedTaskRequestE2E()
  .catch((e) => {
    console.error('❌ Error during E2E seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
