import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApproveReleaseModalProps extends BaseModalProps {
  taskTitle: string;
  credits: number;
  onApprove: () => void;
}

export const ApproveReleaseModal: React.FC<ApproveReleaseModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  credits,
  onApprove,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-base md:text-lg font-bold font-sora text-gray-900">
            Approve & Release Funds
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex items-center justify-center">
            <div className="w-14 md:w-16 h-14 md:h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-7 md:w-8 h-7 md:h-8 text-green-500" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm md:text-base text-gray-600">
              You are about to approve the submission for:
            </p>
            <p className="font-semibold text-gray-900 mt-2 text-sm md:text-base">
              {taskTitle}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 md:p-4 text-center">
            <p className="text-xs md:text-sm text-gray-500">
              Credits to be released
            </p>
            <p className="text-2xl md:text-3xl font-bold text-primary0 mt-1">
              {credits} CR
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3 md:p-4 text-xs md:text-sm text-green-700">
            <p>
              By approving, you confirm that the work meets your requirements.
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 p-4 md:p-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10 md:h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onApprove();
              onClose();
            }}
            className="flex-1 h-10 md:h-11 bg-green-500 hover:bg-green-600 text-white text-sm md:text-base"
          >
            Approve & Release
          </Button>
        </div>
      </div>
    </div>
  );
};

interface RequestRevisionModalProps extends BaseModalProps {
  taskTitle: string;
  onSubmit: (reason: string) => void;
}

export const RequestRevisionModal: React.FC<RequestRevisionModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  onSubmit,
}) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-base md:text-lg font-bold font-sora text-gray-900">
            Request Revision
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex items-center justify-center">
            <div className="w-14 md:w-16 h-14 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-7 md:w-8 h-7 md:h-8 text-yellow-500" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm md:text-base text-gray-600">
              Request changes for:
            </p>
            <p className="font-semibold text-gray-900 mt-2 text-sm md:text-base">
              {taskTitle}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs md:text-sm font-semibold text-gray-700">
              What needs to be changed?
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the changes you need..."
              className="w-full h-24 md:h-32 p-3 md:p-4 border border-gray-200 rounded-xl resize-none focus:border-primary0 focus:ring-2 focus:ring-primary0/20 outline-none text-xs md:text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 p-4 md:p-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10 md:h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSubmit(reason);
              setReason("");
              onClose();
            }}
            disabled={!reason.trim()}
            className="flex-1 h-10 md:h-11 bg-primary0 hover:bg-brand-orange-600 text-white disabled:opacity-50 text-sm md:text-base"
          >
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
};

interface AddCreditsModalProps extends BaseModalProps {
  onSubmit: (amount: number) => void;
}

export const AddCreditsModal: React.FC<AddCreditsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState("");
  const presets = [10, 25, 50, 100];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-base md:text-lg font-bold font-sora text-gray-900">
            Add Credits Securely
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex items-center justify-center">
            <div className="w-14 md:w-16 h-14 md:h-16 bg-brand-indigo-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-7 md:w-8 h-7 md:h-8 text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 md:gap-3">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toString())}
                className={`py-2 md:py-3 rounded-xl font-semibold text-xs md:text-sm transition-all ${
                  amount === preset.toString()
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {preset} CR
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs md:text-sm font-semibold text-gray-700">
              Or enter custom amount
            </label>
            <div className="relative">
              <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs md:text-sm">
                CR
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full h-10 md:h-12 pl-10 md:pl-12 pr-3 md:pr-4 border border-gray-200 rounded-xl text-base md:text-lg font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          {amount && (
            <div className="bg-gray-50 rounded-xl p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-500">Amount to pay</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                £{(parseFloat(amount) * 1).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">1 CR = £1.00</p>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3 p-4 md:p-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10 md:h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSubmit(parseFloat(amount));
              setAmount("");
              onClose();
            }}
            disabled={!amount || parseFloat(amount) <= 0}
            className="flex-1 h-10 md:h-11 bg-primary hover:bg-brand-indigo-600 text-white disabled:opacity-50 text-sm md:text-base"
          >
            Add Credits
          </Button>
        </div>
      </div>
    </div>
  );
};

interface LogoutModalProps extends BaseModalProps {
  onLogout: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 text-center">
          <div className="flex items-center justify-center">
            <div className="w-14 md:w-16 h-14 md:h-16 bg-red-100 rounded-full flex items-center justify-center">
              <LogOut className="w-7 md:w-8 h-7 md:h-8 text-red-500" />
            </div>
          </div>

          <div>
            <h2 className="text-lg md:text-xl font-bold font-sora text-gray-900">
              Log Out?
            </h2>
            <p className="text-sm md:text-base text-gray-500 mt-2">
              Are you sure you want to log out of your account?
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 p-4 md:p-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10 md:h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="flex-1 h-10 md:h-11 bg-red-500 hover:bg-red-600 text-white text-sm md:text-base"
          >
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
};
