"use client";

import { Button } from "@/components/ui/Button";
import { LogOut, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import {
  useGetSessionsQuery,
  useDeleteSessionMutation,
} from "@/redux/features/api/auth/authApi";

export default function SecuritySettings() {
  const {
    data: sessionsData,
    isLoading,
    refetch,
  } = useGetSessionsQuery();

  const [deleteSession, { isLoading: isDeleting }] = useDeleteSessionMutation();

  const activeSessions = sessionsData?.data?.activeSessions || [];
  const previousSessions = sessionsData?.data?.previousSessions || [];

  // Identify current session by matching user agent + recent login (heuristic)
  const currentSession = activeSessions[0]; // Usually the first one is current

  const handleRevoke = async (sessionId: string) => {
    try {
      const res = await deleteSession(sessionId).unwrap();
      toast.success(res.message);
      refetch();
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to revoke session"
      );
    }
  };

  const handleLogoutAll = () => {
    toast.info("Logout from all other devices API is not available yet.");
    // Future implementation: call a /auth/logout-all endpoint
  };

  return (
    <div className="p-8 bg-white rounded-2xl overflow-hidden">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Security</h2>
        <p className="mt-1.5 text-sm text-gray-600">
          Protect your account and data.
        </p>
      </div>

      <div className="py-4 space-y-12">
        {/* Active Sessions */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Active Sessions
          </h3>

          <div className="space-y-4">
            {isLoading ? (
              <div className="p-5 border border-gray-200 rounded-xl">
                <p className="text-sm text-gray-500">Loading sessions...</p>
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="p-5 border border-gray-200 rounded-xl">
                <p className="text-sm text-gray-500">No active sessions found.</p>
              </div>
            ) : (
              activeSessions.map((session) => {
                const isCurrent = session.id === currentSession?.id;

                return (
                  <div
                    key={session.id}
                    className={`p-5 border rounded-xl transition-colors ${
                      isCurrent
                        ? "border-green-300 bg-green-50/30"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">
                            {session.device || "Unknown Device"}
                          </p>
                          {isCurrent && (
                            <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Current
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mt-1">
                          IP: {session.ipAddress || "Unknown"}
                        </p>

                        <p className="text-sm text-gray-600 mt-1">
                          Logged in{" "}
                          {formatDistanceToNow(new Date(session.loginAt), {
                            addSuffix: true,
                          })}
                        </p>

                        {session.userAgent && (
                          <p className="text-xs text-gray-400 mt-2 break-all">
                            {session.userAgent}
                          </p>
                        )}
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => handleRevoke(session.id)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Button
            variant="white"
            onClick={handleLogoutAll}
            className="flex items-center gap-2 rounded-2xl font-medium"
          >
            <LogOut size={18} />
            Logout from all other devices
          </Button>
        </div>

        {/* Previous Sessions */}
        {previousSessions.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Previous Sessions
            </h3>
            <div className="space-y-4">
              {previousSessions.slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  className="p-5 border border-gray-200 rounded-xl bg-gray-50/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {session.device || "Unknown Device"}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        IP: {session.ipAddress}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Logged in{" "}
                        {formatDistanceToNow(new Date(session.loginAt), {
                          addSuffix: true,
                        })}
                      </p>
                      {session.userAgent && (
                        <p className="text-xs text-gray-400 mt-2 break-all">
                          {session.userAgent}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {previousSessions.length > 10 && (
              <p className="text-xs text-gray-500 text-center">
                Showing 10 most recent previous sessions
              </p>
            )}
          </div>
        )}

        {/* Privacy & Data */}
        <div className="space-y-6 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Privacy & Data
          </h3>

          <div className="space-y-5">
            <div className="flex items-center justify-between p-5 bg-gray-50 border border-gray-200 rounded-xl">
              <div>
                <div className="flex items-center gap-2">
                  <Download size={18} className="text-indigo-600" />
                  <p className="font-medium text-gray-900">
                    Request data export (GDPR)
                  </p>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Export your account data and activity history.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">7-10 days</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-5 bg-[#FEE4E2] border border-red-200 rounded-xl">
              <div>
                <div className="flex items-center gap-2">
                  <Trash2 size={18} className="text-red-600" />
                  <p className="font-medium text-gray-900">
                    Request account deletion
                  </p>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Permanently remove your account and associated data.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-red-600 font-medium">Permanent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}