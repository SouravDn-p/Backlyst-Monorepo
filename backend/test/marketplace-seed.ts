import {
  PrismaClient,
  UserRole,
  WebsiteVerificationStatus,
  WebsiteVerificationType,
  WebsiteMarketplaceStatus,
  WebsiteMarketplaceVisibilityStatus,
  PlacementType,
  LinkAttribute,
  CreditWalletType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

export const MARKETPLACE_E2E_IDS = {
  requesterWebsiteId: '11111111-1111-4111-8111-111111111111',
  activeProviderWebsiteId: '22222222-2222-4222-8222-222222222222',
  restrictedProviderWebsiteId: '33333333-3333-4333-8333-333333333333',
  taxonomyCategoryId: '44444444-4444-4444-8444-444444444444',
  unverifiedWebsiteId: '55555555-5555-4555-8555-555555555555',
  metaTagWebsiteId: '66666666-6666-4666-8666-666666666666',
  screenshotWebsiteId: '88888888-8888-4888-8888-888888888888',
  manualReviewWebsiteId: '99999999-9999-4999-8999-999999999999',
  manualReviewFailedVerificationId: '99999999-9999-4999-8999-999999999998',
} as const;

const LEGACY_MARKETPLACE_E2E_WEBSITE_IDS = [
  'e2e-requester-website-id',
  'e2e-provider-active-website-id',
  'e2e-provider-restricted-website-id',
] as const;
import { assertSafeE2EDatabase } from './support/e2e-database-guard';

export async function seedMarketplaceTestData(prisma: PrismaClient) {
  const database = assertSafeE2EDatabase();

  console.log(
    `E2E_DATABASE_GUARD=PASS ${database.host}:${database.port}/${database.database}?schema=${database.schema}`,
  );

  // Keep stale non-UUID fixtures out of all marketplace eligibility queries.
  await prisma.website.updateMany({
    where: {
      id: {
        in: [...LEGACY_MARKETPLACE_E2E_WEBSITE_IDS],
      },
    },
    data: {
      isDeleted: true,
    },
  });
  console.log('--- Seeding Marketplace Test Data ---');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const visibilityActiveUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const ensureWebsiteVisibility = async (
    websiteId: string,
    subscriptionTaskCredits = 0,
  ) => {
    await prisma.website.update({
      where: { id: websiteId },
      data: {
        isDeleted: false,
        isFlag: false,
        isWalletLock: false,
        verificationStatus: WebsiteVerificationStatus.VERIFIED,
        verifiedMethod: WebsiteVerificationType.DNS_TXT_RECORD,
        marketplaceVisibilityStatus: WebsiteMarketplaceVisibilityStatus.VISIBLE,
        visibilityGraceStartedAt: null,
        visibilityGraceEndsAt: null,
      },
    });

    await prisma.websiteCreditWallet.upsert({
      where: { websiteId },
      create: {
        websiteId,
        subscriptionTaskCredits,
        earnedTaskCredits: 0,
        allocatedPurchasedCredits: 0,
        allocatedReferralCredits: 0,
        visibilityCredits: 200,
        visibilityActiveUntil,
      },
      update: {
        subscriptionTaskCredits,
        earnedTaskCredits: 0,
        allocatedPurchasedCredits: 0,
        allocatedReferralCredits: 0,
        visibilityCredits: 200,
        visibilityActiveUntil,
      },
    });
  };

  // Deterministic enabled taxonomy fixture for TC-WF-008.
  await prisma.marketplaceCategory.upsert({
    where: {
      id: MARKETPLACE_E2E_IDS.taxonomyCategoryId,
    },
    create: {
      id: MARKETPLACE_E2E_IDS.taxonomyCategoryId,
      slug: 'e2e-technology',
      name: 'E2E Technology',
      enabled: true,
    },
    update: {
      slug: 'e2e-technology',
      name: 'E2E Technology',
      enabled: true,
      parentId: null,
    },
  });

  // Deterministic administrator fixture for TC-WF-003.
  await prisma.user.upsert({
    where: { email: 'admin.e2e@backlyst.test' },
    create: {
      name: 'E2E Test Administrator',
      email: 'admin.e2e@backlyst.test',
      password: passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
      status: 'ACTIVE',
    },
    update: {
      password: passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
  });

  // Deterministic generic actor fixture for TC-WF-008.
  await prisma.user.upsert({
    where: { email: 'website.actor.e2e@backlyst.test' },
    create: {
      name: 'E2E Website Registration Actor',
      email: 'website.actor.e2e@backlyst.test',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
    update: {
      name: 'E2E Website Registration Actor',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
  });

  // Deterministic DNS configuration and unverified website for TC-WF-011.
  await prisma.websiteVerificationConfig.upsert({
    where: {
      id: 'WEBSITE_VERIFICATION_CONFIG',
    },
    create: {
      id: 'WEBSITE_VERIFICATION_CONFIG',
      metaName: 'backlyst-verification',
      verificationToken: 'e2e-dns-verification-token',
    },
    update: {
      metaName: 'backlyst-verification',
      verificationToken: 'e2e-dns-verification-token',
    },
  });

  const dnsVerificationOwner = await prisma.user.upsert({
    where: {
      email: 'website.dns.owner.e2e@backlyst.test',
    },
    create: {
      name: 'E2E DNS Verification Owner',
      email: 'website.dns.owner.e2e@backlyst.test',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
    update: {
      name: 'E2E DNS Verification Owner',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
  });

  await prisma.websiteVerification.deleteMany({
    where: {
      websiteId: MARKETPLACE_E2E_IDS.unverifiedWebsiteId,
    },
  });

  await prisma.websiteMatchingProfile.deleteMany({
    where: {
      websiteId: MARKETPLACE_E2E_IDS.unverifiedWebsiteId,
    },
  });

  const dnsVerificationWebsite = await prisma.website.upsert({
    where: {
      id: MARKETPLACE_E2E_IDS.unverifiedWebsiteId,
    },
    create: {
      id: MARKETPLACE_E2E_IDS.unverifiedWebsiteId,
      authorId: dnsVerificationOwner.id,
      name: 'E2E DNS Verification Website',
      websiteUrl: 'https://dns-owner-e2e.test',
      rootDomain: 'dns-owner-e2e.test',
      industry: 'TECH',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.PENDING,
      verifiedAt: null,
      verifiedMethod: null,
      latestVerificationId: null,
      isDeleted: false,
    },
    update: {
      authorId: dnsVerificationOwner.id,
      name: 'E2E DNS Verification Website',
      websiteUrl: 'https://dns-owner-e2e.test',
      rootDomain: 'dns-owner-e2e.test',
      industry: 'TECH',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.PENDING,
      verifiedAt: null,
      verifiedMethod: null,
      latestVerificationId: null,
      isDeleted: false,
    },
  });

  // Deterministic meta-tag verification owner and website for TC-WF-012.
  const metaTagVerificationOwner = await prisma.user.upsert({
    where: {
      email: 'website.meta.owner.e2e@backlyst.test',
    },
    create: {
      name: 'E2E Meta Tag Verification Owner',
      email: 'website.meta.owner.e2e@backlyst.test',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
    update: {
      name: 'E2E Meta Tag Verification Owner',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
  });

  await prisma.websiteVerification.deleteMany({
    where: {
      websiteId: MARKETPLACE_E2E_IDS.metaTagWebsiteId,
    },
  });

  await prisma.websiteMatchingProfile.deleteMany({
    where: {
      websiteId: MARKETPLACE_E2E_IDS.metaTagWebsiteId,
    },
  });

  const metaTagVerificationWebsite = await prisma.website.upsert({
    where: {
      id: MARKETPLACE_E2E_IDS.metaTagWebsiteId,
    },
    create: {
      id: MARKETPLACE_E2E_IDS.metaTagWebsiteId,
      authorId: metaTagVerificationOwner.id,
      name: 'E2E Meta Tag Verification Website',
      websiteUrl: 'https://meta-owner-e2e.test',
      rootDomain: 'meta-owner-e2e.test',
      industry: 'TECH',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.PENDING,
      verifiedAt: null,
      verifiedMethod: null,
      latestVerificationId: null,
      isDeleted: false,
    },
    update: {
      authorId: metaTagVerificationOwner.id,
      name: 'E2E Meta Tag Verification Website',
      websiteUrl: 'https://meta-owner-e2e.test',
      rootDomain: 'meta-owner-e2e.test',
      industry: 'TECH',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.PENDING,
      verifiedAt: null,
      verifiedMethod: null,
      latestVerificationId: null,
      isDeleted: false,
    },
  });

  // Deterministic screenshot verification owner and website for TC-WF-013.
  const screenshotVerificationOwner = await prisma.user.upsert({
    where: {
      email: 'website.screenshot.owner.e2e@backlyst.test',
    },
    create: {
      name: 'E2E Screenshot Verification Owner',
      email: 'website.screenshot.owner.e2e@backlyst.test',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
    update: {
      name: 'E2E Screenshot Verification Owner',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
  });

  await prisma.websiteVerification.deleteMany({
    where: {
      websiteId: MARKETPLACE_E2E_IDS.screenshotWebsiteId,
    },
  });

  await prisma.websiteMatchingProfile.deleteMany({
    where: {
      websiteId: MARKETPLACE_E2E_IDS.screenshotWebsiteId,
    },
  });

  const screenshotVerificationWebsite = await prisma.website.upsert({
    where: {
      id: MARKETPLACE_E2E_IDS.screenshotWebsiteId,
    },
    create: {
      id: MARKETPLACE_E2E_IDS.screenshotWebsiteId,
      authorId: screenshotVerificationOwner.id,
      name: 'E2E Screenshot Verification Website',
      websiteUrl: 'https://screenshot-owner-e2e.test',
      rootDomain: 'screenshot-owner-e2e.test',
      industry: 'TECH',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.PENDING,
      verifiedAt: null,
      verifiedMethod: null,
      latestVerificationId: null,
      isDeleted: false,
    },
    update: {
      authorId: screenshotVerificationOwner.id,
      name: 'E2E Screenshot Verification Website',
      websiteUrl: 'https://screenshot-owner-e2e.test',
      rootDomain: 'screenshot-owner-e2e.test',
      industry: 'TECH',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.PENDING,
      verifiedAt: null,
      verifiedMethod: null,
      latestVerificationId: null,
      isDeleted: false,
    },
  });

  // Deterministic failed-verification fixture for TC-WF-014.
  const manualReviewOwner = await prisma.user.upsert({
    where: {
      email: 'website.manual-review.owner.e2e@backlyst.test',
    },
    create: {
      name: 'E2E Manual Review Owner',
      email: 'website.manual-review.owner.e2e@backlyst.test',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
    update: {
      name: 'E2E Manual Review Owner',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isDeleted: false,
      status: 'ACTIVE',
    },
  });

  await prisma.websiteVerification.deleteMany({
    where: {
      websiteId: MARKETPLACE_E2E_IDS.manualReviewWebsiteId,
    },
  });

  await prisma.websiteMatchingProfile.deleteMany({
    where: {
      websiteId: MARKETPLACE_E2E_IDS.manualReviewWebsiteId,
    },
  });

  const manualReviewWebsiteBase = await prisma.website.upsert({
    where: {
      id: MARKETPLACE_E2E_IDS.manualReviewWebsiteId,
    },
    create: {
      id: MARKETPLACE_E2E_IDS.manualReviewWebsiteId,
      authorId: manualReviewOwner.id,
      name: 'E2E Failed Verification Website',
      websiteUrl: 'https://manual-review-owner-e2e.test',
      rootDomain: 'manual-review-owner-e2e.test',
      industry: 'TECH',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.VERIFICATION_FAILED,
      verifiedAt: null,
      verifiedMethod: null,
      latestVerificationId: null,
      isDeleted: false,
    },
    update: {
      authorId: manualReviewOwner.id,
      name: 'E2E Failed Verification Website',
      websiteUrl: 'https://manual-review-owner-e2e.test',
      rootDomain: 'manual-review-owner-e2e.test',
      industry: 'TECH',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.VERIFICATION_FAILED,
      verifiedAt: null,
      verifiedMethod: null,
      latestVerificationId: null,
      isDeleted: false,
    },
  });

  const manualReviewFailedVerification =
    await prisma.websiteVerification.create({
      data: {
        id: MARKETPLACE_E2E_IDS.manualReviewFailedVerificationId,
        websiteId: manualReviewWebsiteBase.id,
        type: WebsiteVerificationType.DNS_TXT_RECORD,
        status: WebsiteVerificationStatus.VERIFICATION_FAILED,
        requestedByUserId: manualReviewOwner.id,
        errorMessage: 'E2E deterministic DNS verification failure',
      },
    });

  const manualReviewWebsite = await prisma.website.update({
    where: {
      id: manualReviewWebsiteBase.id,
    },
    data: {
      verificationStatus: WebsiteVerificationStatus.VERIFICATION_FAILED,
      latestVerificationId: manualReviewFailedVerification.id,
    },
  });

  // 1. Seed Requester User & Credit Wallet
  const requester = await prisma.user.upsert({
    where: { email: 'requester.e2e@backlyst.test' },
    create: {
      name: 'E2E Test Requester',
      email: 'requester.e2e@backlyst.test',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      status: 'ACTIVE',
    },
    update: { password: passwordHash, status: 'ACTIVE' },
  });

  await prisma.userCreditWallet.upsert({
    where: { userId: requester.id },
    create: {
      userId: requester.id,
      earnedTaskCredits: 10,
      purchasedTaskCredits: 50,
      subscriptionTaskCredits: 100,
      referralTaskCredits: 0,
      visibilityCredits: 200,
    },
    update: {
      purchasedTaskCredits: 50,
      subscriptionTaskCredits: 100,
    },
  });

  // 2. Seed Requester Website
  const requesterWebsite = await prisma.website.upsert({
    where: { id: MARKETPLACE_E2E_IDS.requesterWebsiteId },
    create: {
      id: MARKETPLACE_E2E_IDS.requesterWebsiteId,
      authorId: requester.id,
      name: 'E2E Requester Website',
      websiteUrl: 'https://requester-brand-e2e.test',
      rootDomain: 'requester-brand-e2e.test',
      industry: 'MARKETING',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
      verifiedMethod: WebsiteVerificationType.DNS_TXT_RECORD,
    },
    update: {},
  });

  await ensureWebsiteVisibility(requesterWebsite.id, 100);

  await prisma.websiteMatchingProfile.upsert({
    where: { websiteId: requesterWebsite.id },
    create: {
      websiteId: requesterWebsite.id,
      userId: requester.id,
      visibilityScore: 80,
      opportunityScore: 80,
      reputationScore: 85,
      marketplaceStatus: WebsiteMarketplaceStatus.ACTIVE,
    },
    update: {},
  });

  // 3. Seed Active Provider User & Website Profile
  const providerActive = await prisma.user.upsert({
    where: { email: 'provider.active.e2e@backlyst.test' },
    create: {
      name: 'Active E2E Provider',
      email: 'provider.active.e2e@backlyst.test',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      status: 'ACTIVE',
    },
    update: { password: passwordHash, status: 'ACTIVE' },
  });

  const providerActiveWebsite = await prisma.website.upsert({
    where: { id: MARKETPLACE_E2E_IDS.activeProviderWebsiteId },
    create: {
      id: MARKETPLACE_E2E_IDS.activeProviderWebsiteId,
      authorId: providerActive.id,
      name: 'E2E Active Provider Website',
      websiteUrl: 'https://active-publisher-e2e.test',
      rootDomain: 'active-publisher-e2e.test',
      industry: 'TECH',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
      verifiedMethod: WebsiteVerificationType.DNS_TXT_RECORD,
    },
    update: {},
  });

  await ensureWebsiteVisibility(providerActiveWebsite.id);

  await prisma.websiteMatchingProfile.upsert({
    where: { websiteId: providerActiveWebsite.id },
    create: {
      websiteId: providerActiveWebsite.id,
      userId: providerActive.id,
      visibilityScore: 90,
      opportunityScore: 85,
      reputationScore: 90,
      qualityScore: 92,
      marketplaceStatus: WebsiteMarketplaceStatus.ACTIVE,
    },
    update: {
      marketplaceStatus: WebsiteMarketplaceStatus.ACTIVE,
      visibilityScore: 90,
    },
  });

  // 4. Seed Restricted Provider User & Website Profile (Edge Case / Algorithmic Suppression)
  const providerRestricted = await prisma.user.upsert({
    where: { email: 'provider.restricted.e2e@backlyst.test' },
    create: {
      name: 'Restricted E2E Provider',
      email: 'provider.restricted.e2e@backlyst.test',
      password: passwordHash,
      role: UserRole.USER,
      isVerified: true,
      status: 'ACTIVE',
    },
    update: { password: passwordHash, status: 'ACTIVE' },
  });

  const providerRestrictedWebsite = await prisma.website.upsert({
    where: { id: MARKETPLACE_E2E_IDS.restrictedProviderWebsiteId },
    create: {
      id: MARKETPLACE_E2E_IDS.restrictedProviderWebsiteId,
      authorId: providerRestricted.id,
      name: 'E2E Restricted Provider Website',
      websiteUrl: 'https://restricted-publisher-e2e.test',
      rootDomain: 'restricted-publisher-e2e.test',
      industry: 'TECH',
      country: 'US',
      verificationStatus: WebsiteVerificationStatus.VERIFIED,
      verifiedMethod: WebsiteVerificationType.DNS_TXT_RECORD,
    },
    update: {},
  });

  await ensureWebsiteVisibility(providerRestrictedWebsite.id);

  await prisma.websiteMatchingProfile.upsert({
    where: { websiteId: providerRestrictedWebsite.id },
    create: {
      websiteId: providerRestrictedWebsite.id,
      userId: providerRestricted.id,
      visibilityScore: 30,
      opportunityScore: 20,
      reputationScore: 40,
      qualityScore: 35,
      marketplaceStatus: WebsiteMarketplaceStatus.RESTRICTED,
      isSuppressed: true,
    },
    update: {
      marketplaceStatus: WebsiteMarketplaceStatus.RESTRICTED,
      isSuppressed: true,
    },
  });

  return {
    requester,
    requesterWebsite,
    providerActive,
    providerActiveWebsite,
    providerRestricted,
    providerRestrictedWebsite,
    dnsVerificationOwner,
    dnsVerificationWebsite,
    metaTagVerificationOwner,
    metaTagVerificationWebsite,
    screenshotVerificationOwner,
    screenshotVerificationWebsite,
    manualReviewOwner,
    manualReviewWebsite,
    manualReviewFailedVerification,
  };
}
