"use client";

import React from "react";
import { Button } from "./Button";
import { X, LogOut } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
}

const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close logout modal"
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center gap-6">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <LogOut className="w-8 h-8 text-red-600" />
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">
              Sign out?
            </h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to sign out from your account <span className="font-medium text-gray-900">{userName}</span>?
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
