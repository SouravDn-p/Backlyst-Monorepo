import { useGetAdminMeQuery } from "../redux/feature/auth/adminProfileApi";
import type { AdminPermission } from "../redux/feature/auth/adminProfileApi";

/** All valid backend section names */
export type AuthSection =
  | "ADMIN_MANAGEMENT"
  | "DASHBOARD"
  | "ANALYTICS"
  | "MARKETPLACE"
  | "WEBSITES"
  | "CREDITS"
  | "REFERRALS"
  | "SUBSCRIPTIONS"
  | "USERS"
  | "TASKS"
  | "REWARDS"
  | "COMMUNITY_SHOWCASE"
  | "MESSAGING"
  | "NOTIFICATIONS"
  | "LEGAL_DOCS"
  | "COMPLIANCE"
  | "CONTACT"
  | "BLOG"
  | "TAXONOMY"
  | "FORENSIC_AUDIT"
  | "PLATFORM_SETTINGS";

export type PermissionAction = "canRead" | "canCreate" | "canUpdate" | "canDelete";

/**
 * Central permission hook.
 *
 * Usage:
 *   const { isSuperAdmin, can, hasSection } = usePermissions();
 *   if (can("WEBSITES", "canRead")) { ... }
 */
export function usePermissions() {
  const { data: adminResponse, isLoading, isError } = useGetAdminMeQuery();
  const admin = adminResponse?.data;

  const role = admin?.role ?? null;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const permissions: AdminPermission[] = admin?.authorization?.permissions ?? [];

  /**
   * Returns true if the current admin has the given action on the given section.
   * SUPER_ADMIN always returns true.
   */
  function can(section: AuthSection, action: PermissionAction): boolean {
    if (isSuperAdmin) return true;
    const perm = permissions.find((p) => p.section === section);
    if (!perm) return false;
    return perm[action] === true;
  }

  /**
   * Returns true if at least one action flag is true for the section.
   * Used to decide whether to show a sidebar item at all.
   * SUPER_ADMIN always returns true.
   */
  function hasSection(section: AuthSection): boolean {
    if (isSuperAdmin) return true;
    const perm = permissions.find((p) => p.section === section);
    if (!perm) return false;
    return perm.canRead || perm.canCreate || perm.canUpdate || perm.canDelete;
  }

  /**
   * Returns true if the admin has zero permission rows and is not a super admin.
   */
  const hasNoPermissions = !isSuperAdmin && permissions.length === 0;

  /**
   * Returns the raw permission row for a section, or undefined.
   */
  function getPermission(section: AuthSection): AdminPermission | undefined {
    return permissions.find((p) => p.section === section);
  }

  return {
    isSuperAdmin,
    role,
    can,
    hasSection,
    hasNoPermissions,
    getPermission,
    permissions,
    isLoading,
    isError,
  };
}
