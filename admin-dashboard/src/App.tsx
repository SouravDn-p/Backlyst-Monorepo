import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./components/layout/AdminLayout";
import AccessDenied from "./components/layout/AccessDenied";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import WebsitePage from "./pages/WebsitePage";
import TasksPage from "./pages/TasksPage";
import CreditsPage from "./pages/CreditsPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import VisibilityPage from "./pages/VisibilityPage";
import ReviewsPage from "./pages/ReviewsPage";
import InquiryPage from "./pages/InquiryPage";
import MessagesPage from "./pages/MessagesPage";
import ReferralPage from "./pages/ReferralPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import CompliancePage from "./pages/CompliancePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import BlogPage from "./pages/BlogPage";
import BlogFormPage from "./pages/BlogFormPage";
import AdminManagementPage from "./pages/AdminManagementPage";
import { usePermissions, type AuthSection } from "./utils/usePermissions";

// Map from section → the route path it lives on
const SECTION_ROUTES: Partial<Record<AuthSection, string>> = {
  DASHBOARD:         "/",
  USERS:             "/users",
  WEBSITES:          "/websites",
  BLOG:              "/blogs",
  TASKS:             "/tasks",
  CREDITS:           "/credits",
  SUBSCRIPTIONS:     "/subscriptions",
  MARKETPLACE:       "/visibility",
  REWARDS:           "/rewards-badges",
  REFERRALS:         "/referrals",
  COMPLIANCE:        "/compliance",
  MESSAGING:         "/messages",
  CONTACT:           "/support",
  ANALYTICS:         "/analytics",
  PLATFORM_SETTINGS: "/settings",
  FORENSIC_AUDIT:    "/logs",
};

// ─── Token helpers ────────────────────────────────────────────────────────────

const getStoredToken = () =>
  sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken");

// ─── Top-level auth guard ─────────────────────────────────────────────────────

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const token = getStoredToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
  const token = getStoredToken();
  if (token) return <Navigate to="/" replace />;
  return children;
};

// ─── Section permission guard ─────────────────────────────────────────────────

/**
 * Wraps a page element and blocks access unless the admin has the given
 * section permission (or is a SUPER_ADMIN).
 *
 * Shows a loading state while /auth/me is in flight so there's no flash
 * of the access denied screen on first render.
 */
const RequirePermission = ({
  section,
  sectionLabel,
  children,
}: {
  section: AuthSection;
  sectionLabel: string;
  children: React.ReactNode;
}) => {
  const { can, isSuperAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-indigo/20 border-t-brand-indigo rounded-full animate-spin" />
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
            Verifying Access...
          </p>
        </div>
      </div>
    );
  }

  if (isSuperAdmin || can(section, "canRead")) {
    return <>{children}</>;
  }

  return <AccessDenied sectionLabel={sectionLabel} />;
};

/**
 * Smart landing component for '/'. If the admin has DASHBOARD.canRead they
 * see the dashboard. Otherwise they're redirected to their first permitted
 * section. If they have zero permissions, we show the access-denied screen
 * instead of an empty redirect loop.
 */
const SmartDashboardRedirect = () => {
  const { can, isSuperAdmin, hasNoPermissions, isLoading, permissions } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-indigo/20 border-t-brand-indigo rounded-full animate-spin" />
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Verifying Access...</p>
        </div>
      </div>
    );
  }

  // Super admin always lands on dashboard
  if (isSuperAdmin || can("DASHBOARD", "canRead")) {
    return <DashboardPage />;
  }

  // Find the first section this admin can read and redirect there
  if (!hasNoPermissions && permissions.length > 0) {
    for (const [section, path] of Object.entries(SECTION_ROUTES)) {
      if (section === "DASHBOARD") continue; // already checked above
      if (can(section as AuthSection, "canRead")) {
        return <Navigate to={path!} replace />;
      }
    }
  }

  // No readable sections at all
  return <AccessDenied sectionLabel="Dashboard" />;
};

const RequireSuperAdmin = ({ children }: { children: React.ReactNode }) => {
  const { isSuperAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-indigo/20 border-t-brand-indigo rounded-full animate-spin" />
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
            Verifying Access...
          </p>
        </div>
      </div>
    );
  }

  if (isSuperAdmin) return <>{children}</>;

  return <AccessDenied sectionLabel="Admin Management" showDashboard />;
};

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <Router>
      <Routes>
        {/* ── Public ── */}
        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          }
        />

        {/* ── Protected layout ── */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          {/* Dashboard — smart: SUPER_ADMIN + DASHBOARD.canRead → dashboard,
               otherwise redirect to first accessible section */}
          <Route
            index
            element={<SmartDashboardRedirect />}
          />

          {/* Users — requires USERS.canRead */}
          <Route
            path="users"
            element={
              <RequirePermission section="USERS" sectionLabel="Users & Accounts">
                <UsersPage />
              </RequirePermission>
            }
          />

          {/* Websites — requires WEBSITES.canRead */}
          <Route
            path="websites"
            element={
              <RequirePermission section="WEBSITES" sectionLabel="Websites">
                <WebsitePage />
              </RequirePermission>
            }
          />

          {/* Blogs — requires BLOG.canRead */}
          <Route
            path="blogs"
            element={
              <RequirePermission section="BLOG" sectionLabel="Blogs">
                <BlogPage />
              </RequirePermission>
            }
          />
          <Route
            path="blogs/create"
            element={
              <RequirePermission section="BLOG" sectionLabel="Blogs">
                <BlogFormPage />
              </RequirePermission>
            }
          />
          <Route
            path="blogs/edit/:id"
            element={
              <RequirePermission section="BLOG" sectionLabel="Blogs">
                <BlogFormPage />
              </RequirePermission>
            }
          />

          {/* Tasks — requires TASKS.canRead */}
          <Route
            path="tasks"
            element={
              <RequirePermission section="TASKS" sectionLabel="Tasks">
                <TasksPage />
              </RequirePermission>
            }
          />

          {/* Credits — requires CREDITS.canRead */}
          <Route
            path="credits"
            element={
              <RequirePermission section="CREDITS" sectionLabel="Credits">
                <CreditsPage />
              </RequirePermission>
            }
          />

          {/* Subscriptions — requires SUBSCRIPTIONS.canRead */}
          <Route
            path="subscriptions"
            element={
              <RequirePermission section="SUBSCRIPTIONS" sectionLabel="Subscriptions">
                <SubscriptionsPage />
              </RequirePermission>
            }
          />

          {/* Visibility / Marketplace — requires MARKETPLACE.canRead */}
          <Route
            path="visibility"
            element={
              <RequirePermission section="MARKETPLACE" sectionLabel="Visibility">
                <VisibilityPage />
              </RequirePermission>
            }
          />

          {/* Rewards & Badges — requires REWARDS.canRead */}
          <Route
            path="rewards-badges"
            element={
              <RequirePermission section="REWARDS" sectionLabel="Rewards & Badges">
                <ReviewsPage />
              </RequirePermission>
            }
          />
          <Route path="reviews" element={<Navigate to="/rewards-badges" replace />} />

          {/* Referrals — requires REFERRALS.canRead */}
          <Route
            path="referrals"
            element={
              <RequirePermission section="REFERRALS" sectionLabel="Referrals">
                <ReferralPage />
              </RequirePermission>
            }
          />

          {/* Messages — requires MESSAGING.canRead */}
          <Route
            path="messages"
            element={
              <RequirePermission section="MESSAGING" sectionLabel="Messages & Files">
                <MessagesPage />
              </RequirePermission>
            }
          />

          {/* Support inquiries — requires CONTACT.canRead */}
          <Route
            path="support"
            element={
              <RequirePermission section="CONTACT" sectionLabel="Support Inquiries">
                <InquiryPage />
              </RequirePermission>
            }
          />

          {/* Compliance — requires COMPLIANCE.canRead */}
          <Route
            path="compliance"
            element={
              <RequirePermission section="COMPLIANCE" sectionLabel="Compliance & Governance">
                <CompliancePage />
              </RequirePermission>
            }
          />

          {/* Analytics — requires ANALYTICS.canRead */}
          <Route
            path="analytics"
            element={
              <RequirePermission section="ANALYTICS" sectionLabel="Analytics">
                <AnalyticsPage />
              </RequirePermission>
            }
          />

          {/* Settings — requires PLATFORM_SETTINGS.canRead */}
          <Route
            path="settings"
            element={
              <RequirePermission section="PLATFORM_SETTINGS" sectionLabel="System Settings">
                <SettingsPage />
              </RequirePermission>
            }
          />

          {/* Audit Logs — requires FORENSIC_AUDIT.canRead */}
          <Route
            path="logs"
            element={
              <RequirePermission section="FORENSIC_AUDIT" sectionLabel="Audit Logs">
                <AuditLogsPage />
              </RequirePermission>
            }
          />

          {/* Blog redirect alias */}
          <Route path="blog" element={<Navigate to="/blogs" replace />} />

          {/* Admin Management — SUPER_ADMIN only */}
          <Route
            path="admin-management"
            element={
              <RequireSuperAdmin>
                <AdminManagementPage />
              </RequireSuperAdmin>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
