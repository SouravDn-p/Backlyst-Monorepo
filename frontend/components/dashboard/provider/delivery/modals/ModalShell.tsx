"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;

  heightClass?: string;

  /** Layout control (one at a time) */
  widthClass?: string;
  minHeightClass?: string;
  maxHeightClass?: string;

  /** Styling hooks */
  overlayClassName?: string;
  contentClassName?: string;
};

export default function ModalShell({
  open,
  onClose,
  children,
  widthClass = "max-w-5xl",
  minHeightClass = "min-h-[60vh]",
  maxHeightClass = "max-h-[92vh]",

  overlayClassName = "",
  contentClassName = "",
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className={`fixed inset-0 z-90 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 md:p-4 ${overlayClassName}`}
    >
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full overflow-y-auto max-h-[90vh] md:max-h-[92vh]
          ${widthClass}
          ${minHeightClass}
          ${maxHeightClass}
          ${contentClassName}
        `}
        style={{ animation: "modalIn 0.18s ease-out" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute cursor-pointer top-3 md:top-4 right-3 md:right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-[#f2f4f7] hover:bg-[#e9eaeb] text-[#535862] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {children}
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
