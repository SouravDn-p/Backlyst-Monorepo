import {
  CreditWalletType,
  DirectTaskRequestStatus,
  LinkAttribute,
  PlacementType,
  PrismaClient,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  PLAYWRIGHT_AUTH_FIXTURES,
  PLAYWRIGHT_AUTH_PASSWORD,
  PLAYWRIGHT_WEBSITES_MANAGER_PERMISSIONS,
} from './authorization-fixtures';

const prisma = new PrismaClient();

async function upsertUser(
  email: string,
  data: {
    name: string;
    role: UserRole;
    passwordHash: string;
  },
) {
  return prisma.user.upsert({
    where: { email },
    create: {
      name: data.name,
      email,
      password: data.passwordHash,
      role: data.role,
      isVerified: true,
      status: UserStatus.ACTIVE,
      isDeleted: false,
      registrationTime: new Date(),
    },
    update: {
      name: data.name,
      password: data.passwordHash,
      role: data.role,
      isVerified: true,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    },
  });
}

async function replaceAdminPermissions(
  adminId: string,
  assignedById: string,
  permissions: readonly {
    section: (typeof PLAYWRIGHT_WEBSITES_MANAGER_PERMISSIONS)[number]['section'];
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }[],
) {
  await prisma.adminPermission.deleteMany({
    where: { adminId },
  });

  if (!permissions.length) {
    return;
  }

  await prisma.adminPermission.createMany({
    data: permissions.map((permission) => ({
      adminId,
      assignedById,
      section: permission.section,
      canCreate: permission.canCreate,
      canRead: permission.canRead,
      canUpdate: permission.canUpdate,
      canDelete: permission.canDelete,
    })),
  });
}

export async function seedMasterE2E() {
  console.log('🌱 Seeding Master Playwright E2E Dataset...');

  const passwordHash = await bcrypt.hash(PLAYWRIGHT_AUTH_PASSWORD, 10);

  // 0. Seed E2E Category
  const category = await prisma.marketplaceCategory.upsert({
    where: { slug: 'technology' },
    create: {
      id: '3e49aa20-cc3a-4f9c-bf7d-b13d29f6b0af',
      name: 'Technology',
      slug: 'technology',
      enabled: true,
    },
    update: {
      enabled: true,
    },
  });

  // 1. Create Requester User
  const requester = await upsertUser('pw-requester@e2e.com', {
    name: 'Playwright Requester',
    role: UserRole.USER,
    passwordHash,
  });

  // 2. Create Provider User
  const provider = await upsertUser('pw-provider@e2e.com', {
    name: 'Playwright Provider',
    role: UserRole.USER,
    passwordHash,
  });

  // 3. Create authorization fixture users
  const superAdmin = await upsertUser(
    PLAYWRIGHT_AUTH_FIXTURES.users.superAdmin.email,
    {
      name: PLAYWRIGHT_AUTH_FIXTURES.users.superAdmin.name,
      role: UserRole.SUPER_ADMIN,
      passwordHash,
    },
  );

  const websitesAdmin = await upsertUser(
    PLAYWRIGHT_AUTH_FIXTURES.users.websitesAdmin.email,
    {
      name: PLAYWRIGHT_AUTH_FIXTURES.users.websitesAdmin.name,
      role: UserRole.ADMIN,
      passwordHash,
    },
  );

  const noAccessAdmin = await upsertUser(
    PLAYWRIGHT_AUTH_FIXTURES.users.noAccessAdmin.email,
    {
      name: PLAYWRIGHT_AUTH_FIXTURES.users.noAccessAdmin.name,
      role: UserRole.ADMIN,
      passwordHash,
    },
  );

  const admin = await upsertUser(
    PLAYWRIGHT_AUTH_FIXTURES.users.legacyAdmin.email,
    {
      name: PLAYWRIGHT_AUTH_FIXTURES.users.legacyAdmin.name,
      role: UserRole.ADMIN,
      passwordHash,
    },
  );

  const managedWebsiteOwner = await upsertUser(
    PLAYWRIGHT_AUTH_FIXTURES.users.managedWebsiteOwner.email,
    {
      name: PLAYWRIGHT_AUTH_FIXTURES.users.managedWebsiteOwner.name,
      role: UserRole.USER,
      passwordHash,
    },
  );

  await replaceAdminPermissions(
    websitesAdmin.id,
    superAdmin.id,
    PLAYWRIGHT_WEBSITES_MANAGER_PERMISSIONS,
  );
  await replaceAdminPermissions(
    admin.id,
    superAdmin.id,
    PLAYWRIGHT_WEBSITES_MANAGER_PERMISSIONS,
  );
  await replaceAdminPermissions(noAccessAdmin.id, superAdmin.id, []);
  await replaceAdminPermissions(superAdmin.id, superAdmin.id, []);

  // 4. Ensure Master Credit Wallets
  await prisma.userCreditWallet.upsert({
    where: { userId: requester.id },
    create: {
      userId: requester.id,
      earnedTaskCredits: 0,
      visibilityCredits: 10,
    },
    update: {},
  });

  await prisma.userCreditWallet.upsert({
    where: { userId: provider.id },
    create: {
      userId: provider.id,
      earnedTaskCredits: 5,
      visibilityCredits: 10,
    },
    update: {},
  });
  await prisma.userCreditWallet.upsert({
    where: { userId: managedWebsiteOwner.id },
    create: {
      userId: managedWebsiteOwner.id,
      earnedTaskCredits: 0,
      visibilityCredits: 10,
    },
    update: {},
  });

  // 5. Create Requester Website
  const requesterWebsite = await prisma.website.upsert({
    where: { websiteUrl: 'https://pw-requester-site.com' },
    create: {
      name: 'Playwright Requester Site',
      authorId: requester.id,
      websiteUrl: 'https://pw-requester-site.com',
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

  // 6. Create Provider Website
  const providerWebsite = await prisma.website.upsert({
    where: { websiteUrl: 'https://pw-provider-site.com' },
    create: {
      name: 'Playwright Provider Site',
      authorId: provider.id,
      websiteUrl: 'https://pw-provider-site.com',
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

  // 7. Create dedicated website for admin authorization mutation tests
  const managedWebsite = await prisma.website.upsert({
    where: { websiteUrl: PLAYWRIGHT_AUTH_FIXTURES.websites.managed.websiteUrl },
    create: {
      name: PLAYWRIGHT_AUTH_FIXTURES.websites.managed.name,
      authorId: managedWebsiteOwner.id,
      websiteUrl: PLAYWRIGHT_AUTH_FIXTURES.websites.managed.websiteUrl,
      industry: PLAYWRIGHT_AUTH_FIXTURES.websites.managed.industry,
      country: PLAYWRIGHT_AUTH_FIXTURES.websites.managed.country,
      verificationStatus: 'VERIFIED',
      marketplaceVisibilityStatus: 'VISIBLE',
    },
    update: {
      name: PLAYWRIGHT_AUTH_FIXTURES.websites.managed.name,
      authorId: managedWebsiteOwner.id,
      industry: PLAYWRIGHT_AUTH_FIXTURES.websites.managed.industry,
      country: PLAYWRIGHT_AUTH_FIXTURES.websites.managed.country,
      verificationStatus: 'VERIFIED',
      marketplaceVisibilityStatus: 'VISIBLE',
      isDeleted: false,
      isFlag: false,
      isWalletLock: false,
    },
  });

  // 8. Ensure Website Credit Wallets with credits
  await prisma.websiteCreditWallet.upsert({
    where: { websiteId: requesterWebsite.id },
    create: {
      websiteId: requesterWebsite.id,
      subscriptionTaskCredits: 50,
      allocatedPurchasedCredits: 50,
      allocatedReferralCredits: 50,
      earnedTaskCredits: 0,
    },
    update: {
      subscriptionTaskCredits: 50,
      allocatedPurchasedCredits: 50,
      allocatedReferralCredits: 50,
    },
  });

  await prisma.websiteCreditWallet.upsert({
    where: { websiteId: providerWebsite.id },
    create: {
      websiteId: providerWebsite.id,
      subscriptionTaskCredits: 20,
      allocatedPurchasedCredits: 0,
      allocatedReferralCredits: 0,
      earnedTaskCredits: 10,
    },
    update: {},
  });
  await prisma.websiteCreditWallet.upsert({
    where: { websiteId: managedWebsite.id },
    create: {
      websiteId: managedWebsite.id,
      subscriptionTaskCredits: 10,
      allocatedPurchasedCredits: 0,
      allocatedReferralCredits: 0,
      earnedTaskCredits: 0,
    },
    update: {
      subscriptionTaskCredits: 10,
      allocatedPurchasedCredits: 0,
      allocatedReferralCredits: 0,
      earnedTaskCredits: 0,
    },
  });

  // 9. Replace the provider direct-task fixtures so reruns stay deterministic.
  const directTaskTitles = [
    'Pending SEO Link Insertion',
    'Pending Guest Post - High Quality',
    'Accepted Niche Edit',
  ];

  await prisma.directTaskRequest.deleteMany({
    where: {
      requesterId: requester.id,
      targetProviderId: provider.id,
      projectTitle: { in: directTaskTitles },
    },
  });

  const directTaskBase = {
    requesterId: requester.id,
    requesterWebsiteId: requesterWebsite.id,
    targetProviderId: provider.id,
    targetUrl: 'https://pw-requester-site.com/target-page',
    anchorText: 'playwright anchor',
    placementGuidelines: 'Playwright direct-task fixture',
    requiredDomainRating: 40,
    linkAttribute: LinkAttribute.DOFOLLOW,
    requestedDeadlineDays: 7,
    creditCost: 1,
    reservedCreditAmount: 1,
    walletType: CreditWalletType.EARNED,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    supportDocuments: [],
  };

  await prisma.directTaskRequest.createMany({
    data: [
      {
        ...directTaskBase,
        projectTitle: directTaskTitles[0],
        placementType: PlacementType.BACKLINK_INSERTION,
        status: DirectTaskRequestStatus.PENDING,
      },
      {
        ...directTaskBase,
        projectTitle: directTaskTitles[1],
        placementType: PlacementType.GUEST_POST,
        status: DirectTaskRequestStatus.PENDING,
      },
      {
        ...directTaskBase,
        projectTitle: directTaskTitles[2],
        placementType: PlacementType.BACKLINK_INSERTION,
        status: DirectTaskRequestStatus.ACCEPTED,
      },
    ],
  });

  console.log('✅ Master Playwright E2E Dataset Seeded Successfully!');
  return {
    requester,
    provider,
    superAdmin,
    websitesAdmin,
    noAccessAdmin,
    admin,
    managedWebsiteOwner,
    requesterWebsite,
    providerWebsite,
    managedWebsite,
  };
}

if (require.main === module) {
  seedMasterE2E()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
