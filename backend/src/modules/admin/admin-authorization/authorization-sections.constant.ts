import { AdminAuthorizationSection } from '@prisma/client';

export const ADMIN_AUTHORIZATION_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
] as const;

export const ADMIN_AUTHORIZATION_SECTIONS: AdminAuthorizationSection[] = [
  AdminAuthorizationSection.ADMIN_MANAGEMENT,
  AdminAuthorizationSection.DASHBOARD,
  AdminAuthorizationSection.ANALYTICS,
  AdminAuthorizationSection.MARKETPLACE,
  AdminAuthorizationSection.WEBSITES,
  AdminAuthorizationSection.CREDITS,
  AdminAuthorizationSection.REFERRALS,
  AdminAuthorizationSection.SUBSCRIPTIONS,
  AdminAuthorizationSection.USERS,
  AdminAuthorizationSection.TASKS,
  AdminAuthorizationSection.REWARDS,
  AdminAuthorizationSection.COMMUNITY_SHOWCASE,
  AdminAuthorizationSection.MESSAGING,
  AdminAuthorizationSection.NOTIFICATIONS,
  AdminAuthorizationSection.LEGAL_DOCS,
  AdminAuthorizationSection.COMPLIANCE,
  AdminAuthorizationSection.CONTACT,
  AdminAuthorizationSection.BLOG,
  AdminAuthorizationSection.TAXONOMY,
  AdminAuthorizationSection.FORENSIC_AUDIT,
  AdminAuthorizationSection.PLATFORM_SETTINGS,
];

export const buildSuperAdminPermissions = () =>
  ADMIN_AUTHORIZATION_SECTIONS.map((section) => ({
    section,
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }));
