ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

CREATE TYPE "AdminAuthorizationSection" AS ENUM (
  'ADMIN_MANAGEMENT',
  'DASHBOARD',
  'ANALYTICS',
  'MARKETPLACE',
  'WEBSITES',
  'CREDITS',
  'REFERRALS',
  'SUBSCRIPTIONS',
  'USERS',
  'TASKS',
  'REWARDS',
  'COMMUNITY_SHOWCASE',
  'MESSAGING',
  'NOTIFICATIONS',
  'LEGAL_DOCS',
  'COMPLIANCE',
  'CONTACT',
  'BLOG',
  'TAXONOMY',
  'FORENSIC_AUDIT',
  'PLATFORM_SETTINGS'
);

CREATE TYPE "AdminAuthorizationAuditAction" AS ENUM (
  'ADMIN_CREATED',
  'ADMIN_UPDATED',
  'ADMIN_DELETED',
  'PERMISSIONS_REPLACED'
);

CREATE TABLE "AdminPermission" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "section" "AdminAuthorizationSection" NOT NULL,
  "canCreate" BOOLEAN NOT NULL DEFAULT false,
  "canRead" BOOLEAN NOT NULL DEFAULT false,
  "canUpdate" BOOLEAN NOT NULL DEFAULT false,
  "canDelete" BOOLEAN NOT NULL DEFAULT false,
  "assignedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminPermissionAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "targetAdminId" TEXT,
  "action" "AdminAuthorizationAuditAction" NOT NULL,
  "previousValue" JSONB,
  "newValue" JSONB,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminPermissionAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminPermission_adminId_section_key" ON "AdminPermission"("adminId", "section");
CREATE INDEX "AdminPermission_adminId_idx" ON "AdminPermission"("adminId");
CREATE INDEX "AdminPermission_section_idx" ON "AdminPermission"("section");
CREATE INDEX "AdminPermissionAuditLog_actorId_createdAt_idx" ON "AdminPermissionAuditLog"("actorId", "createdAt");
CREATE INDEX "AdminPermissionAuditLog_targetAdminId_createdAt_idx" ON "AdminPermissionAuditLog"("targetAdminId", "createdAt");
CREATE INDEX "AdminPermissionAuditLog_action_idx" ON "AdminPermissionAuditLog"("action");

ALTER TABLE "AdminPermission"
  ADD CONSTRAINT "AdminPermission_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminPermission"
  ADD CONSTRAINT "AdminPermission_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminPermissionAuditLog"
  ADD CONSTRAINT "AdminPermissionAuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminPermissionAuditLog"
  ADD CONSTRAINT "AdminPermissionAuditLog_targetAdminId_fkey"
  FOREIGN KEY ("targetAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
