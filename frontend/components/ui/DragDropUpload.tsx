"use client";

import { useRef } from "react";
import { FolderOpen } from "lucide-react";

type DragDropUploadProps = {
  onFilesSelect: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeText?: string;
  title?: string;
  description?: string;
  className?: string;
};

export default function DragDropUpload({
  onFilesSelect,
  accept = "*",
  multiple = true,
  maxSizeText = "Up to 100 MB total",
  title = "DRAG & DROP FILES HERE",
  description = "Upload files as needed.",
  className = "",
}: DragDropUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    onFilesSelect(files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`p-2 md:p-10 text-center cursor-pointer transition-all
        border-[#e9eaeb] hover:border-secondary 
        ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-col px-8 py-12 max-w-xl mx-auto items-center gap-3 bg-gray-100 rounded-2xl">
        <div className="w-14 h-14 rounded-full flex items-center justify-center">
          <FolderOpen className="w-10 h-10 text-gray-400" />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-[#535862] mt-1">{description}</p>
          <p className="text-xs text-[#9DA4AE] mt-1">({maxSizeText})</p>
        </div>
      </div>
    </div>
  );
}
