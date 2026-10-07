import React, { useState } from "react";
import {
  X,
  Shield,
  Ban,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  UserX,
  MessageSquare,
  Clock,
  Mail,
} from "lucide-react";
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}
interface SuspendUserModalProps extends BaseModalProps {
  userName: string;
  userId: string;
  onSuspend: (reason: string, duration: string) => void;
}

export const SuspendUserModal: React.FC<SuspendUserModalProps> = ({
  isOpen,
  onClose,
  userName,
  userId,
  onSuspend,
}) => {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("7_days");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-black font-sora text-gray-900 uppercase tracking-tight">
            Suspend User
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <UserX className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600">You are about to suspend:</p>
            <p className="font-black text-gray-900 text-lg mt-1">{userName}</p>
            <p className="text-xs text-gray-400 mt-1">ID: {userId}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Suspension Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full h-12 bg-gray-50 rounded-2xl px-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-brand-indigo/10"
              >
                <option value="24_hours">24 Hours</option>
                <option value="7_days">7 Days</option>
                <option value="30_days">30 Days</option>
                <option value="permanent">Permanent</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Reason for Suspension
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the violation or reason..."
                className="w-full h-24 p-4 bg-gray-50 rounded-2xl resize-none text-sm font-medium border-none outline-none focus:ring-4 focus:ring-brand-indigo/10"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSuspend(reason, duration);
              setReason("");
              onClose();
            }}
            disabled={!reason.trim()}
            className="flex-1 h-12 bg-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-600 disabled:opacity-50"
          >
            Suspend User
          </button>
        </div>
      </div>
    </div>
  );
};
interface ApprovePayoutModalProps extends BaseModalProps {
  userName: string;
  amount: string;
  onApprove: () => void;
}

export const ApprovePayoutModal: React.FC<ApprovePayoutModalProps> = ({
  isOpen,
  onClose,
  userName,
  amount,
  onApprove,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-black font-sora text-gray-900 uppercase tracking-tight">
            Approve Payout
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600">Payout request from:</p>
            <p className="font-black text-gray-900 text-lg mt-1">{userName}</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Amount
            </p>
            <p className="text-3xl font-black font-sora text-white mt-2">
              {amount}
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-700">
            <p>
              This will initiate the payout process. Funds will be transferred
              within 24-48 hours.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApprove();
              onClose();
            }}
            className="flex-1 h-12 bg-green-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-green-600"
          >
            Approve Payout
          </button>
        </div>
      </div>
    </div>
  );
};
interface VerifyWebsiteModalProps extends BaseModalProps {
  websiteName: string;
  websiteUrl: string;
  onVerify: () => void;
  onReject: (reason: string) => void;
}

export const VerifyWebsiteModal: React.FC<VerifyWebsiteModalProps> = ({
  isOpen,
  onClose,
  websiteName,
  websiteUrl,
  onVerify,
  onReject,
}) => {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-black font-sora text-gray-900 uppercase tracking-tight">
            {showReject ? "Reject Website" : "Verify Website"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                showReject ? "bg-red-100" : "bg-brand-indigo-soft"
              }`}
            >
              {showReject ? (
                <Ban className="w-8 h-8 text-red-500" />
              ) : (
                <Shield className="w-8 h-8 text-brand-indigo" />
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="font-black text-gray-900 text-lg">{websiteName}</p>
            <p className="text-sm text-brand-indigo mt-1">{websiteUrl}</p>
          </div>

          {showReject ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Reason for Rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this website is being rejected..."
                className="w-full h-24 p-4 bg-gray-50 rounded-2xl resize-none text-sm font-medium border-none outline-none focus:ring-4 focus:ring-brand-indigo/10"
              />
            </div>
          ) : (
            <div className="bg-brand-indigo-soft border border-brand-indigo/20 rounded-2xl p-4 text-sm text-brand-indigo">
              <p>
                Verify that this website meets our quality standards and has
                proper ownership documentation.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100">
          {showReject ? (
            <>
              <button
                onClick={() => setShowReject(false)}
                className="flex-1 h-12 bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={() => {
                  onReject(rejectReason);
                  setRejectReason("");
                  setShowReject(false);
                  onClose();
                }}
                disabled={!rejectReason.trim()}
                className="flex-1 h-12 bg-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-600 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowReject(true)}
                className="flex-1 h-12 bg-red-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-200"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  onVerify();
                  onClose();
                }}
                className="flex-1 h-12 bg-brand-indigo rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-brand-indigo-light"
              >
                Verify
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
interface ResolveTicketModalProps extends BaseModalProps {
  ticketId: string;
  subject: string;
  onResolve: (response: string) => void;
}

export const ResolveTicketModal: React.FC<ResolveTicketModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  subject,
  onResolve,
}) => {
  const [response, setResponse] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-black font-sora text-gray-900 uppercase tracking-tight">
            Resolve Ticket
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {ticketId}
            </p>
            <p className="font-black text-gray-900 text-lg mt-2">{subject}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Resolution Response
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Provide a response to the user..."
              className="w-full h-32 p-4 bg-gray-50 rounded-2xl resize-none text-sm font-medium border-none outline-none focus:ring-4 focus:ring-brand-indigo/10"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onResolve(response);
              setResponse("");
              onClose();
            }}
            disabled={!response.trim()}
            className="flex-1 h-12 bg-green-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-green-600 disabled:opacity-50"
          >
            Mark Resolved
          </button>
        </div>
      </div>
    </div>
  );
};
interface ConfirmationModalProps extends BaseModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "success" | "primary";
  onConfirm: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  onConfirm,
}) => {
  if (!isOpen) return null;

  const getVariantClasses = () => {
    switch (confirmVariant) {
      case "danger":
        return "bg-red-500 hover:bg-red-600";
      case "success":
        return "bg-green-500 hover:bg-green-600";
      default:
        return "bg-brand-indigo hover:bg-brand-indigo-light";
    }
  };

  const getIconBg = () => {
    switch (confirmVariant) {
      case "danger":
        return "bg-red-100";
      case "success":
        return "bg-green-100";
      default:
        return "bg-brand-indigo-soft";
    }
  };

  const getIcon = () => {
    switch (confirmVariant) {
      case "danger":
        return <AlertTriangle className="w-8 h-8 text-red-500" />;
      case "success":
        return <CheckCircle2 className="w-8 h-8 text-green-500" />;
      default:
        return <Shield className="w-8 h-8 text-brand-indigo" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] shadow-xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-6 text-center">
          <div className="flex items-center justify-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${getIconBg()}`}
            >
              {getIcon()}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black font-sora text-gray-900">
              {title}
            </h2>
            <p className="text-gray-500 mt-2">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white ${getVariantClasses()}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
