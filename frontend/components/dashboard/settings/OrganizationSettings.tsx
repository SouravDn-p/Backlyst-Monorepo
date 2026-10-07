"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Save, ChevronDown } from "lucide-react";
import { useGetMeQuery } from "@/redux/features/api/auth/authApi";
import { useUpdateProfileMutation } from "@/redux/features/api/settings/account/accountSettingsApi";
import { BusinessType } from "@/types/settings/accountSettingsType";
import { toast } from "sonner";

export default function OrganizationSettings() {
  const { data: userResponse, isLoading } = useGetMeQuery();
  const user = userResponse?.data;
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [countryRegion, setCountryRegion] = useState("");
  const [taxId, setTaxId] = useState("");

  useEffect(() => {
    if (user) {
      setCompanyName(user.companyName || "");
      setBusinessType((user.businessType as BusinessType) || "");
      setCountryRegion(user.country || "");
      setTaxId(user.vatUid || "");
    }
  }, [user]);

  const handleSave = async () => {
    try {
      const payload: any = {};

    if (companyName.trim()) {
      payload.companyName = companyName.trim();
    }

    if (businessType) {
      payload.businessType = businessType as BusinessType;
    }

    if (countryRegion) {
      payload.country = countryRegion;
    }

    // Only send vatUid if it's not empty
    if (taxId.trim()) {
      payload.vatUid = taxId.trim();
    }

    // Prevent sending empty object
    if (Object.keys(payload).length === 0) {
      toast.error("Please fill in at least one field.");
      return;
    }

      await updateProfile(payload).unwrap();
      toast.success("Organization settings saved successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update organization settings.");
    }
  };

  return (
    <div className="p-8 bg-white rounded-2xl overflow-hidden">
      <div className="">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          Organization Details
        </h2>
        <p className="mt-1.5 text-sm text-gray-600">
          Business identity used for billing and compliance.
        </p>
      </div>

      <div className="py-8 space-y-10">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Company Name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="Enter company name"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Business Type
          </label>
          <div className="relative">
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType | "")}
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Select business type...</option>
              <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
              <option value="PARTNERSHIP">Partnership</option>
              <option value="LIMITED_COMPANY">LLC / Limited Liability Company</option>
              <option value="CORPORATION">Corporation</option>
              <option value="OTHER">Other</option>
            </select>
            <ChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              size={18}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Country / Region
          </label>
          <div className="relative">
            <select
              value={countryRegion}
              onChange={(e) => setCountryRegion(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Select country / region...</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="BD">Bangladesh</option>
              <option value="IN">India</option>
              <option value="other">Other</option>
            </select>
            <ChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              size={18}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            VAT / Tax ID{" "}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="e.g. US123456789 or EU VAT number"
          />
        </div>
      </div>

      <div className="px-8 py-6   border-t border-gray-100 flex justify-center md:justify-end">
        <Button
          onClick={handleSave}
          disabled={isUpdating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} />
          {isUpdating ? "Saving..." : "Save Organization Settings"}
        </Button>
      </div>
    </div>
  );
}
