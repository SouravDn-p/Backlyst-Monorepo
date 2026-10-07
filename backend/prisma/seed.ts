import {
  CreditWalletType,
  LinkAttribute,
  PlacementFinalTaskType,
  PlacementType,
  PrismaClient,
  ResponsibilityType,
  SubmissionStatus,
  TaskStatus,
  UserRole,
  WebsiteVerificationStatus,
  WebsiteVerificationType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const adminSeed = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@e.com'; // TODO: for testing using hardcoded email and password
  const adminPassword = process.env.ADMIN_PASSWORD || '12345678';

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
      registrationTime: new Date(),
      status: 'ACTIVE',
    },
    update: {
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
  });

  await prisma.userCreditWallet.upsert({
    where: { userId: admin.id },
    create: {
      userId: admin.id,
      earnedTaskCredits: 0,
      visibilityCredits: 0,
    },
    update: {},
  });

  console.log('âœ… Admin ready:', admin.email);
};
const userSeed = async () => {
  const userEmail = 'user@e.com';
  const userPassword = '12345678';

  // check first â†’ avoid unnecessary hashing
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (existingUser) {
    console.log('âš ï¸ user already exists, skipping...');
    return;
  }

  const hashedPassword = await bcrypt.hash(userPassword, 10);

  const user = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: userEmail,
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: true,
      registrationTime: new Date(),
      status: 'ACTIVE',
    },
  });

  await prisma.userCreditWallet.create({
    data: {
      userId: user.id,
      earnedTaskCredits: 0,
      visibilityCredits: 0,
    },
  });

  console.log('âœ… User created:', user.email);
};

const dummyTaskSeed = async () => {
  const password = await bcrypt.hash('12345678', 10);
  const now = new Date();

const websiteSeedSelect = { id: true, websiteUrl: true } as const;

  const daysFromNow = (days: number) =>
    new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const requester = await prisma.user.upsert({
    where: { email: 'requester@e.com' },
    create: {
      name: 'Demo Requester',
      email: 'requester@e.com',
      password,
      role: UserRole.USER,
      isVerified: true,
      registrationTime: now,
      status: 'ACTIVE',
      country: 'United States',
      companyName: 'Backlyst Labs',
    },
    update: {
      name: 'Demo Requester',
      password,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
  });

  const provider = await prisma.user.upsert({
    where: { email: 'provider@e.com' },
    create: {
      name: 'Demo Provider',
      email: 'provider@e.com',
      password,
      role: UserRole.USER,
      isVerified: true,
      registrationTime: now,
      status: 'ACTIVE',
      country: 'United States',
      companyName: 'Publisher Network',
    },
    update: {
      name: 'Demo Provider',
      password,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
  });

  await Promise.all(
    [requester.id, provider.id].map((userId) =>
      prisma.userCreditWallet.upsert({
        where: { userId },
        create: {
          userId,
          subscriptionTaskCredits: 50,
          earnedTaskCredits: 10,
          purchasedTaskCredits: 20,
          referralTaskCredits: 5,
          visibilityCredits: 100,
        },
        update: {
          subscriptionTaskCredits: 50,
          earnedTaskCredits: 10,
          purchasedTaskCredits: 20,
          referralTaskCredits: 5,
          visibilityCredits: 100,
        },
      }),
    ),
  );

  const requesterWebsite = await prisma.website.upsert({
    select: websiteSeedSelect,
    where: { websiteUrl: 'https://requester-demo.example.com' },
    create: {
      name: 'Requester Demo Blog',
      authorId: requester.id,
      websiteUrl: 'https://requester-demo.example.com',
      industry: 'SaaS',
      country: 'United States',
      description: 'Demo source website for admin task testing.',
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
      verifiedAt: now,
      verifiedMethod: WebsiteVerificationType.HTML_META_TAG,
    },
    update: {
      name: 'Requester Demo Blog',
      authorId: requester.id,
      industry: 'SaaS',
      country: 'United States',
      isDeleted: false,
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
      verifiedAt: now,
      verifiedMethod: WebsiteVerificationType.HTML_META_TAG,
    },
  });

  const providerWebsite = await prisma.website.upsert({
    select: websiteSeedSelect,
    where: { websiteUrl: 'https://provider-demo.example.com' },
    create: {
      name: 'Provider Demo Magazine',
      authorId: provider.id,
      websiteUrl: 'https://provider-demo.example.com',
      industry: 'Marketing',
      country: 'United States',
      description: 'Demo publisher website for assigned tasks.',
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
      verifiedAt: now,
      verifiedMethod: WebsiteVerificationType.DNS_TXT_RECORD,
    },
    update: {
      name: 'Provider Demo Magazine',
      authorId: provider.id,
      industry: 'Marketing',
      country: 'United States',
      isDeleted: false,
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
      verifiedAt: now,
      verifiedMethod: WebsiteVerificationType.DNS_TXT_RECORD,
    },
  });

  const secondProviderWebsite = await prisma.website.upsert({
    select: websiteSeedSelect,
    where: { websiteUrl: 'https://tech-publisher.example.com' },
    create: {
      name: 'Tech Publisher Test',
      authorId: provider.id,
      websiteUrl: 'https://tech-publisher.example.com',
      industry: 'Technology',
      country: 'United States',
      description: 'Second demo publisher website for admin filters.',
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
      verifiedAt: now,
      verifiedMethod: WebsiteVerificationType.SCREENSHOT_URL,
    },
    update: {
      name: 'Tech Publisher Test',
      authorId: provider.id,
      industry: 'Technology',
      country: 'United States',
      isDeleted: false,
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
      verifiedAt: now,
      verifiedMethod: WebsiteVerificationType.SCREENSHOT_URL,
    },
  });

  await Promise.all(
    [requesterWebsite.id, providerWebsite.id, secondProviderWebsite.id].map(
      (websiteId) =>
        prisma.websiteCreditWallet.upsert({
          where: { websiteId },
          create: {
            websiteId,
            subscriptionTaskCredits: 30,
            earnedTaskCredits: 10,
            allocatedPurchasedCredits: 15,
            allocatedReferralCredits: 5,
            visibilityCredits: 50,
          },
          update: {
            subscriptionTaskCredits: 30,
            earnedTaskCredits: 10,
            allocatedPurchasedCredits: 15,
            allocatedReferralCredits: 5,
            visibilityCredits: 50,
          },
        }),
    ),
  );

  const tasks = [
    {
      id: 'seed-admin-task-open',
      projectTitle: 'Homepage backlink placement',
      targetUrl: 'https://backlyst.example.com/homepage-seo',
      anchorText: 'best backlink platform',
      placementType: PlacementType.BACKLINK_INSERTION,
      linkAttribute: LinkAttribute.DOFOLLOW,
      lifecycleStatus: TaskStatus.OPEN,
      submissionStatus: SubmissionStatus.NOT_SUBMITTED,
      assignedProviderWebsiteId: null,
      selectedProviderId: null,
      requestedDeadlineDays: 7,
      deliveryDeadline: daysFromNow(7),
      creditCost: 3,
      isLate: false,
      publishedAt: daysFromNow(-2),
      createdAt: daysFromNow(-2),
    },
    {
      id: 'seed-admin-task-assigned',
      projectTitle: 'SaaS review guest mention',
      targetUrl: 'https://backlyst.example.com/saas-review',
      anchorText: 'SaaS link building',
      placementType: PlacementType.GUEST_POST,
      linkAttribute: LinkAttribute.SPONSORED,
      lifecycleStatus: TaskStatus.ASSIGNED,
      submissionStatus: SubmissionStatus.NOT_SUBMITTED,
      assignedProviderWebsiteId: providerWebsite.id,
      selectedProviderId: provider.id,
      requestedDeadlineDays: 10,
      deliveryDeadline: daysFromNow(5),
      creditCost: 6,
      isLate: false,
      publishedAt: daysFromNow(-6),
      assignedAt: daysFromNow(-4),
      createdAt: daysFromNow(-6),
    },
    {
      id: 'seed-admin-task-progress',
      projectTitle: 'Marketing guide contextual link',
      targetUrl: 'https://backlyst.example.com/contextual-links',
      anchorText: 'contextual backlink guide',
      placementType: PlacementType.FLEXIBLE,
      linkAttribute: LinkAttribute.NOFOLLOW,
      lifecycleStatus: TaskStatus.IN_PROGRESS,
      submissionStatus: SubmissionStatus.NOT_SUBMITTED,
      assignedProviderWebsiteId: secondProviderWebsite.id,
      selectedProviderId: provider.id,
      requestedDeadlineDays: 5,
      deliveryDeadline: daysFromNow(-1),
      creditCost: 4,
      isLate: true,
      publishedAt: daysFromNow(-8),
      assignedAt: daysFromNow(-6),
      createdAt: daysFromNow(-8),
    },
    {
      id: 'seed-admin-task-submitted',
      projectTitle: 'Analytics article link insertion',
      targetUrl: 'https://backlyst.example.com/analytics-seo',
      anchorText: 'analytics for SEO teams',
      placementType: PlacementType.BACKLINK_INSERTION,
      linkAttribute: LinkAttribute.UGC,
      lifecycleStatus: TaskStatus.SUBMITTED,
      submissionStatus: SubmissionStatus.SUBMITTED,
      assignedProviderWebsiteId: providerWebsite.id,
      selectedProviderId: provider.id,
      requestedDeadlineDays: 3,
      deliveryDeadline: daysFromNow(1),
      creditCost: 2,
      isLate: false,
      publishedAt: daysFromNow(-5),
      assignedAt: daysFromNow(-4),
      submittedAt: daysFromNow(-1),
      createdAt: daysFromNow(-5),
    },
    {
      id: 'seed-admin-task-completed',
      projectTitle: 'Completed fintech guest post',
      targetUrl: 'https://backlyst.example.com/fintech-growth',
      anchorText: 'fintech growth tactics',
      placementType: PlacementType.GUEST_POST,
      linkAttribute: LinkAttribute.DOFOLLOW,
      lifecycleStatus: TaskStatus.COMPLETED,
      submissionStatus: SubmissionStatus.APPROVED,
      assignedProviderWebsiteId: secondProviderWebsite.id,
      selectedProviderId: provider.id,
      requestedDeadlineDays: 14,
      deliveryDeadline: daysFromNow(-3),
      creditCost: 8,
      finalCreditCost: 8,
      finalTaskType: PlacementFinalTaskType.GUEST_POST,
      providerRewardCredits: 8,
      isLate: false,
      publishedAt: daysFromNow(-18),
      assignedAt: daysFromNow(-16),
      submittedAt: daysFromNow(-7),
      approvedAt: daysFromNow(-5),
      completedAt: daysFromNow(-5),
      createdAt: daysFromNow(-18),
    },
    {
      id: 'seed-admin-task-disputed',
      projectTitle: 'Disputed travel resource link',
      targetUrl: 'https://backlyst.example.com/travel-resources',
      anchorText: 'travel resource backlinks',
      placementType: PlacementType.FLEXIBLE,
      linkAttribute: LinkAttribute.NOFOLLOW,
      lifecycleStatus: TaskStatus.DISPUTED,
      submissionStatus: SubmissionStatus.REVISION_REQUESTED,
      assignedProviderWebsiteId: providerWebsite.id,
      selectedProviderId: provider.id,
      requestedDeadlineDays: 7,
      deliveryDeadline: daysFromNow(-4),
      creditCost: 5,
      isLate: true,
      publishedAt: daysFromNow(-14),
      assignedAt: daysFromNow(-12),
      submittedAt: daysFromNow(-8),
      createdAt: daysFromNow(-14),
    },
    {
      id: 'seed-admin-task-frozen',
      projectTitle: 'Frozen healthcare placement',
      targetUrl: 'https://backlyst.example.com/healthcare-seo',
      anchorText: 'healthcare SEO strategy',
      placementType: PlacementType.BACKLINK_INSERTION,
      linkAttribute: LinkAttribute.SPONSORED,
      lifecycleStatus: TaskStatus.FROZEN,
      submissionStatus: SubmissionStatus.NOT_SUBMITTED,
      assignedProviderWebsiteId: null,
      selectedProviderId: null,
      requestedDeadlineDays: 10,
      deliveryDeadline: daysFromNow(3),
      creditCost: 4,
      isLate: false,
      publishedAt: daysFromNow(-3),
      frozenAt: daysFromNow(-1),
      createdAt: daysFromNow(-3),
    },
  ];

  for (const task of tasks) {
    await prisma.placementTask.upsert({
      where: { id: task.id },
      create: {
        ...task,
        requesterId: requester.id,
        requesterWebsiteId: requesterWebsite.id,
        placementGuidelines:
          'Seed data for testing the admin task list and filters.',
        requiredDomainRating: 30,
        responsibilityType: ResponsibilityType.PROVIDER,
        reservedCreditAmount: task.creditCost,
        walletType: CreditWalletType.SUBSCRIPTION,
      },
      update: {
        ...task,
        requesterId: requester.id,
        requesterWebsiteId: requesterWebsite.id,
        placementGuidelines:
          'Seed data for testing the admin task list and filters.',
        requiredDomainRating: 30,
        responsibilityType: ResponsibilityType.PROVIDER,
        reservedCreditAmount: task.creditCost,
        walletType: CreditWalletType.SUBSCRIPTION,
      },
    });
  }

  console.log(`âœ… Dummy admin tasks ready: ${tasks.length}`);
};

export async function runSeed() {
  await adminSeed();
  // NOTE : Temporary user dummy process commented if it required then we will uncomment later
  // await userSeed();
  // await dummyTaskSeed();
  // await referralSeed();
}

export async function disconnectSeedPrisma() {
  await prisma.$disconnect();
}

const referralSeed = async () => {
  const admin = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL || 'admin@e.com' } });
  const provider = await prisma.user.findUnique({ where: { email: 'provider@e.com' } });
  const requester = await prisma.user.findUnique({ where: { email: 'requester@e.com' } });
  const referred = await prisma.user.findUnique({ where: { email: 'user@e.com' } });

  if (!provider || !requester || !referred || !admin) {
    console.log('âš ï¸ Skipping referral seed â€” required users not present');
    return;
  }

  const requesterWebsite = await prisma.website.findUnique({ where: { websiteUrl: 'https://requester-demo.example.com' } });

  // Referral 1: provider referred 'user@e.com'
  await prisma.userReferral.upsert({
    where: { referredUserId: referred.id },
    create: {
      referrerUserId: provider.id,
      referredUserId: referred.id,
      referredWebsiteId: requesterWebsite?.id,
      codeUsed: 'CODE-ABC123',
      currentStage: 'WEBSITE_VERIFIED',
      status: 'VERIFIED',
      source: 'DIRECT_REFERRAL',
      signedUpAt: new Date(),
    },
    update: {
      referrerUserId: provider.id,
      referredWebsiteId: requesterWebsite?.id,
      codeUsed: 'CODE-ABC123',
      currentStage: 'WEBSITE_VERIFIED',
      status: 'VERIFIED',
    },
  });

  const referral = await prisma.userReferral.findUnique({ where: { referredUserId: referred.id } });
  if (referral) {
    await prisma.referralReward.upsert({
      where: { referralId_stage: { referralId: referral.id, stage: 'WEBSITE_VERIFIED' } },
      create: {
        referralId: referral.id,
        stage: 'WEBSITE_VERIFIED',
        referrerTaskCredits: 5,
      },
      update: { referrerTaskCredits: 5 },
    });

    // Create an admin audit log entry for visibility
    if (admin) {
      await prisma.adminReferralAuditLog.create({
        data: {
          referralId: referral.id,
          adminId: admin.id,
          action: 'SEED_REFERRAL',
          reason: 'Initial seed data',
        },
      });
    }
  }

  // Referral 2: requester referred a new fake user
  const fakeReferredEmail = 'referred2@e.com';
  let referred2 = await prisma.user.findUnique({ where: { email: fakeReferredEmail } });
  if (!referred2) {
    const password = await bcrypt.hash('12345678', 10);
    referred2 = await prisma.user.create({
      data: {
        name: 'Referred Two',
        email: fakeReferredEmail,
        password,
        role: 'USER',
        isVerified: true,
        registrationTime: new Date(),
        status: 'ACTIVE',
      },
    });
  }

  await prisma.userReferral.upsert({
    where: { referredUserId: referred2.id },
    create: {
      referrerUserId: requester.id,
      referredUserId: referred2.id,
      codeUsed: 'CODE-XYZ789',
      currentStage: 'SIGNED_UP',
      status: 'PENDING',
      source: 'DIRECT_REFERRAL',
      signedUpAt: new Date(),
    },
    update: {
      referrerUserId: requester.id,
      codeUsed: 'CODE-XYZ789',
      currentStage: 'SIGNED_UP',
      status: 'PENDING',
    },
  });

  console.log('✅ Referral seed complete');
};

void runSeed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectSeedPrisma();
  });
