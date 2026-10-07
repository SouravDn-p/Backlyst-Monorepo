"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Upload,
  Link as LinkIcon,
  FolderOpen,
  Info,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import DragDropUpload from "@/components/ui/DragDropUpload";

export default function SubmitDeliveryTab() {
  const [selectedTask, setSelectedTask] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const activeTasks = [
    { id: "task-001", title: "Guest Post - TechTrends.io (DR 72)" },
    { id: "task-002", title: "Niche Edit - AuthorityBlog.com (DR 85)" },
    { id: "task-003", title: "Link Insertion - Startuply.io" },
  ];

  const handleFiles = (files: FileList) => {
    console.log(files);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8 font-inter">
      {/* Select Task */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          SELECT TASK TO DELIVER
        </label>
        <div className="relative">
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full px-4 py-3.5 bg-white border border-[#e9eaeb] rounded-xl appearance-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none transition-all cursor-pointer text-sm text-gray-900"
          >
            <option value="">Choose an active task...</option>
            {activeTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            size={18}
          />
        </div>
      </div>

      {/* Delivery Message */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          DELIVERY MESSAGE
        </label>
        <textarea
          value={deliveryMessage}
          onChange={(e) => setDeliveryMessage(e.target.value)}
          placeholder="Write a brief submission note to the requester..."
          rows={4}
          className="w-full px-4 py-3.5 border border-[#e9eaeb] rounded-xl resize-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none transition-all text-sm"
        />
      </div>

      {/* Proof Attachments */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#535862]">
          PROOF ATTACHMENTS
        </label>

        <DragDropUpload
          onFilesSelect={handleFiles}
          accept="image/*,.pdf,.zip"
          title="UPLOAD DELIVERY PROOF"
          description="Upload screenshots, reports, or source files."
          maxSizeText="Up to 100 MB"
        />

        {/* Preview uploaded files */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Uploaded files ({files.length})
            </p>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-secondary" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-xs">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Optional Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proof URL */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#535862]">
            PROOF URL (OPTIONAL)
          </label>
          <div className="relative">
            <LinkIcon
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <Input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://google.drive.link / live link..."
              className="w-full pl-11 pr-4 py-3.5 border border-[#e9eaeb] rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#535862]">
            ADDITIONAL NOTES (OPTIONAL)
          </label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Password for archives, special instructions, etc..."
            rows={1}
            className="w-full px-4 py-2.5 border border-[#e9eaeb] rounded-xl resize-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none transition-all text-sm"
          />
        </div>
      </div>
    </div>
  );
}
