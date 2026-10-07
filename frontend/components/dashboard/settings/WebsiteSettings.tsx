import { Button } from "@/components/ui/Button";
import { ChevronDown, Info, Save } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export default function WebsiteSettings() {
  const [defaultLinkType, setDefaultLinkType] = useState("");
  const [autoAcceptTasks, setAutoAcceptTasks] = useState(false);
  const [manualReviewRequired, setManualReviewRequired] = useState(true);

  const handleSave = () => {
    console.log("Saving website defaults:", {
      defaultLinkType,
      autoAcceptTasks,
      manualReviewRequired,
    });
    toast.success("Website defaults saved successfully!");
  };

  return (
    <div className=" p-8 bg-white rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="">
        <h2 className="text-2xl font-semibold text-gray-900">
          Website Defaults
        </h2>
        <p className="mt-1.5 text-sm text-gray-600">
          Default behavior for connected domains.
        </p>
      </div>

      <div className="py-4 space-y-10">
        {/* Default Link Type */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Default link type
          </label>
          <div className="relative">
            <select
              value={defaultLinkType}
              onChange={(e) => setDefaultLinkType(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Select default link type...</option>
              <option value="dofollow">DoFollow</option>
              <option value="nofollow">NoFollow</option>
              <option value="ugc">UGC (User Generated Content)</option>
              <option value="sponsored">Sponsored</option>
            </select>
            <ChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              size={18}
            />
          </div>
          <p className="text-xs text-gray-500 italic">
            Applied to new tasks unless specified otherwise
          </p>
        </div>

        {/* Auto-accept tasks */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Auto-accept tasks
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatically accept matching task requests
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoAcceptTasks}
                onChange={(e) => setAutoAcceptTasks(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Manual review required */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Manual review required
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Review all tasks before marking as complete
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={manualReviewRequired}
                onChange={(e) => setManualReviewRequired(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-8 py-6 border-t border-gray-100 flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl font-medium shadow-md transition-all flex items-center gap-2"
        >
          <Save size={18} />
          Save Website Defaults
        </Button>
      </div>
    </div>
  );
}
