import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldOff, ArrowLeft, LayoutDashboard } from "lucide-react";

interface AccessDeniedProps {
  /** Section name shown in the message e.g. "Websites" */
  sectionLabel?: string;
  /** Whether to show the "Go to Dashboard" button */
  showDashboard?: boolean;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  sectionLabel,
  showDashboard = true,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-6 py-16 select-none">
      {/* Glow backdrop */}
      <div className="relative flex flex-col items-center text-center max-w-md">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-brand-indigo/8 rounded-full blur-[80px] pointer-events-none" />

        {/* Icon */}
        <div className="relative z-10 w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-8 shadow-inner">
          <ShieldOff size={36} className="text-gray-400" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <h2 className="relative z-10 text-[22px] font-black text-gray-900 uppercase tracking-wide leading-tight mb-3">
          Access Restricted
        </h2>

        {/* Sub-message */}
        <p className="relative z-10 text-[14px] text-gray-400 font-medium leading-relaxed mb-2">
          {sectionLabel
            ? `Your account does not have permission to access the ${sectionLabel} section.`
            : "Your account does not have permission to access this section."}
        </p>
        <p className="relative z-10 text-[13px] text-gray-300 font-medium leading-relaxed mb-10">
          Contact your Super Admin to request the necessary permissions.
        </p>

        {/* Permission code badge */}
        <div className="relative z-10 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.12em]">
            HTTP 403 · Insufficient Permissions
          </span>
        </div>

        {/* Actions */}
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <ArrowLeft size={15} />
            Go Back
          </button>

          {showDashboard && (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#331ffd] text-white text-[13px] font-bold hover:bg-[#5242ff] transition-all shadow-sm shadow-brand-indigo/20"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
