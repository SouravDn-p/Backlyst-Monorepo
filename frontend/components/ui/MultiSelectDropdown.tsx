import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MultiSelectDropdown({
  options,
  selectedIds,
  onChange,
  disabled = false,
  placeholder = "Select options...",
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedIds);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal state when opened
  useEffect(() => {
    if (isOpen) {
      setTempSelectedIds(selectedIds);
    }
  }, [isOpen, selectedIds]);

  // Click outside to close without saving
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (id: string) => {
    setTempSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onChange(tempSelectedIds);
    setIsOpen(false);
  };

  const selectedNames = selectedIds
    .map((id) => options.find((o) => o.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="relative w-full flex-1" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-sm text-[#181d27] bg-transparent outline-none cursor-pointer py-1 ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <span className="truncate pr-4 text-left">
          {selectedNames || <span className="text-[#9DA4AE]">{placeholder}</span>}
        </span>
        <ChevronDown className="w-4 h-4 text-[#535862] shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-full bg-white border border-[#e9eaeb] rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-[300px]">
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {options.length === 0 ? (
              <div className="text-sm text-[#535862] p-2 text-center">No options available</div>
            ) : (
              options.map((option) => {
                const isSelected = tempSelectedIds.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 p-2 hover:bg-[#fafafa] rounded-lg cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-white"
                          : "border-[#e9eaeb] bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                    </div>
                    <span className="text-sm text-[#181d27]">{option.name}</span>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isSelected}
                      onChange={() => handleToggle(option.id)}
                    />
                  </label>
                );
              })
            )}
          </div>
          <div className="p-3 border-t border-[#e9eaeb] bg-[#fafafa]">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full bg-primary hover:opacity-90 text-white font-semibold text-sm py-2 rounded-lg transition-all"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
