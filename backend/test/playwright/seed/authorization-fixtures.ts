import { AdminAuthorizationSection } from '@prisma/client';

export const PLAYWRIGHT_AUTH_PASSWORD = 'password123';

export const PLAYWRIGHT_AUTH_FIXTURES = {
  users: {
    superAdmin: {
      name: 'Playwright Super Admin',
      email: 'pw-super-admin@e2e.com',
    },
    websitesAdmin: {
      name: 'Playwright Websites Admin',
      email: 'pw-admin-websites@e2e.com',
    },
    noAccessAdmin: {
      name: 'Playwright No Access Admin',
      email: 'pw-admin-no-access@e2e.com',
    },
    legacyAdmin: {
      name: 'Playwright Admin',
      email: 'pw-admin@e2e.com',
    },
    managedWebsiteOwner: {
      name: 'Playwright Managed Website Owner',
      email: 'pw-managed-website-owner@e2e.com',
    },
  },
  websites: {
    managed: {
      name: 'Playwright Managed Site',
      websiteUrl: 'https://pw-managed-site.com',
      industry: 'Technology',
      country: 'US',
    },
  },
} as const;

export const PLAYWRIGHT_WEBSITES_MANAGER_PERMISSIONS = [
  {
    section: AdminAuthorizationSection.WEBSITES,
    canCreate: false,
    canRead: true,
    canUpdate: true,
    canDelete: false,
  },
] as const;
