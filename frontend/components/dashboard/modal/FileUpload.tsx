"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import {
  Eye,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";

type FileUploadProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  title?: string;
  description?: string;
  maxSizeText?: string;
  accept?: string;
};

type PreviewItem = {
  file: File;
  url: string;
  isImage: boolean;
};

export default function FileUpload({
  files,
  onFilesChange,
  title = "Proof Attachments",
  description = "Upload screenshots, reports, archives, or supporting documents.",
  maxSizeText = "Up to 100 MB",
  accept = "image/*,.pdf,.zip,.doc,.docx,.txt",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewItem | null>(null);

  const previewItems = useMemo(
    () =>
      files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      isImage: file.type.startsWith("image/"),
      })),
    [files],
  );

  useEffect(
    () => () => {
      previewItems.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [previewItems],
  );

  const appendFiles = (newFiles: FileList | File[]) => {
    const added = Array.from(newFiles);

    if (!added.length) return;

    onFilesChange([...files, ...added]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    appendFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  };

  const handleSelectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    appendFiles(event.target.files);
    event.target.value = "";
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const nextFiles = files.filter((_, index) => index !== indexToRemove);
    onFilesChange(nextFiles);
  };

  const openFilePreview = (item: PreviewItem) => {
    if (item.isImage) {
      setPreviewFile(item);
      return;
    }

    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const closePreview = () => setPreviewFile(null);

  return (
    <>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-[#181d27] uppercase tracking-widest">
          {title}
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 md:p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
            dragOver
              ? "border-[#fd751f] bg-[#fff7ed]"
              : "border-[#e0e0e0] bg-[#f9f9f9] hover:border-[#c5c5c5] hover:bg-[#f5f5f5]"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              dragOver ? "bg-[#fd751f]/10" : "bg-[#f0f0f0]"
            }`}
          >
            <Upload
              className={`w-6 h-6 transition-colors ${
                dragOver ? "text-[#fd751f]" : "text-[#a4a7ae]"
              }`}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-[#414651] uppercase tracking-wide">
              Drag &amp; Drop Files Here
            </p>
            <p className="text-xs text-[#a4a7ae] mt-1">{description}</p>
            <p className="text-xs text-[#9ca3af] mt-1">({maxSizeText})</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={handleSelectFiles}
          />
        </div>
      </div>

      {previewItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#717680]" />
            <p className="text-xs font-semibold uppercase tracking-widest text-[#414651]">
              Uploaded Files
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {previewItems.map((item, index) => (
              <div
                key={`${item.file.name}-${item.file.lastModified}-${index}`}
                className="overflow-hidden rounded-2xl border border-[#e9eaeb] bg-white shadow-sm"
              >
                {item.isImage ? (
                  <button
                    type="button"
                    onClick={() => openFilePreview(item)}
                    className="block w-full overflow-hidden bg-[#f9fafb]"
                  >
                    <Image
                      unoptimized
                      src={item.url}
                      alt={item.file.name}
                      width={800}
                      height={440}
                      className="h-44 w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-44 items-center justify-center bg-[#f9fafb] px-4">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#fd751f]">
                        <FileText className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="max-w-[220px] truncate text-sm font-semibold text-[#181d27]">
                          {item.file.name}
                        </p>
                        <p className="mt-1 text-xs text-[#667085]">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3 border-t border-[#eaecf0] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#181d27]">
                      {item.file.name}
                    </p>
                    <p className="mt-1 text-xs text-[#667085]">
                      {item.isImage ? "Image preview available" : "File preview available"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openFilePreview(item)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#e9eaeb] px-3 py-1.5 text-xs font-semibold text-[#344054] transition-colors hover:border-[#fd751f] hover:text-[#fd751f]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#fde3db] bg-[#fff7ed] px-3 py-1.5 text-xs font-semibold text-[#c4320a] transition-colors hover:bg-[#ffe4d6]"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewFile && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eaecf0] px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#181d27]">File Preview</p>
                <p className="mt-1 truncate text-xs text-[#667085]">
                  {previewFile.file.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eaecf0] text-[#667085] transition-colors hover:bg-[#f9fafb]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-[#f9fafb] p-4">
              {previewFile.isImage ? (
                <Image
                  unoptimized
                  src={previewFile.url}
                  alt={previewFile.file.name}
                  width={1400}
                  height={900}
                  className="max-h-[70vh] w-full rounded-xl object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#d0d5dd] bg-white px-6 py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#fd751f]">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[#181d27]">
                      {previewFile.file.name}
                    </p>
                    <p className="mt-1 text-sm text-[#667085]">
                      {(previewFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(previewFile.url, "_blank", "noopener,noreferrer")}
                    className="rounded-xl bg-[#fd751f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e65c00]"
                  >
                    Open File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
