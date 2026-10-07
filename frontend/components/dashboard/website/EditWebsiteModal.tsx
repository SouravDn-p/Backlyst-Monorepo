"use client";

import { useState, useEffect } from "react";
import { Globe, Layers, Info, Save, CheckCircle2 } from "lucide-react";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import {
  useUpdateWebsiteMutation,
  useGetWebsiteCategoryKeysQuery,
} from "@/redux/features/api/website/websiteApi";
import type { Website } from "@/types/website/websiteTypes";
import {
  LEGACY_INDUSTRY_MAP,
  getPrimaryCategories,
  getSecondaryCategories,
} from "@/config/industryTaxonomy.config";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Bangladesh",
  "India",
  "Canada",
  "Australia",
  "Other",
];

type Props = {
  open: boolean;
  onClose: () => void;
  website: Website | null;
};

export default function EditWebsiteModal({ open, onClose, website }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("United States");
  const [tagline, setTagline] = useState("");
  const [logoKey, setLogoKey] = useState("");
  
  const [marketplaceCategoryId, setMarketplaceCategoryId] = useState("");
  const [secondaryMarketplaceCategoryIds, setSecondaryMarketplaceCategoryIds] = useState<string[]>([]);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [updateWebsite, { isLoading }] = useUpdateWebsiteMutation();
  const { data: categoryKeysData } = useGetWebsiteCategoryKeysQuery(undefined, { skip: !open });

  const categoryKeys = categoryKeysData?.data.filter(c => c.enabled) || [];
  const primaryCategories = getPrimaryCategories(categoryKeys);
  const secondaryCategories = getSecondaryCategories(categoryKeys, marketplaceCategoryId);

  useEffect(() => {
    if (website && open && categoryKeys.length > 0) {
      setName(website.name || "");
      setDescription(website.description || "");
      setCountry(website.country || "United States");
      setTagline(website.tagline || "");
      setLogoKey(website.logoKey || "");
      setIndustry(website.industry || "");

      // Extract existing categories
      // @ts-ignore - marketplaceCategories might exist on website model depending on include, assuming it does as per plan
      const existingCats: any[] = website.marketplaceCategories || [];
      const primaryCat = existingCats.find((c: any) => c.role === 'PRIMARY');
      const secondaryCats = existingCats.filter((c: any) => c.role === 'SECONDARY');

      if (primaryCat) {
        setMarketplaceCategoryId(primaryCat.categoryId);
        setSecondaryMarketplaceCategoryIds(secondaryCats.map((c: any) => c.categoryId));
      } else if (website.industry) {
        // Fallback for legacy websites: auto-map from string to primary category
        const mappedSlug = LEGACY_INDUSTRY_MAP[website.industry] || 'other';
        const matchedPrimary = primaryCategories.find(c => c.slug === mappedSlug);
        if (matchedPrimary) {
          setMarketplaceCategoryId(matchedPrimary.id);
        }
        setSecondaryMarketplaceCategoryIds([]);
      }

      setSuccess(false);
      setError("");
    }
  }, [website, open, categoryKeys.length]); // Intentionally omitting primaryCategories to avoid infinite loops

  // Keep legacy industry string synced
  useEffect(() => {
    if (marketplaceCategoryId) {
      const selectedCat = primaryCategories.find(c => c.id === marketplaceCategoryId);
      if (selectedCat && industry !== selectedCat.name) {
        setIndustry(selectedCat.name);
      }
    }
  }, [marketplaceCategoryId, primaryCategories, industry]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSuccess(false);
      setError("");
    }, 200);
  };

  const handleSave = async () => {
    if (!website) return;
    setError("");
    setSuccess(false);

    try {
      await updateWebsite({
        websiteId: website.id,
        body: {
          name: name.trim(),
          description: description.trim(),
          industry,
          country,
          tagline: tagline.trim(),
          logoKey: logoKey.trim() || undefined,
          marketplaceCategoryId: marketplaceCategoryId || undefined,
          secondaryMarketplaceCategoryIds: secondaryMarketplaceCategoryIds.length > 0 ? secondaryMarketplaceCategoryIds : undefined,
        },
      }).unwrap();
      setSuccess(true);
    } catch (err) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data
          ? String(err.data.message)
          : "Failed to update website. Please try again.";
      setError(message);
    }
  };

  if (!website) return null;

  return (
    <ModalShell open={open} onClose={handleClose}>
      <div className="flex flex-col">
        <div className="px-6 pt-6 pb-5 pr-12">
          <h2 className="text-2xl font-bold text-[#181d27]">Edit Website</h2>
          <p className="text-sm text-[#535862] mt-1">
            Update your website information. Changes will be reflected
            immediately.
          </p>
        </div>

        {success && (
          <div className="mx-6 mb-4 flex items-center gap-3 bg-[#ECFDF3] border border-[#6CE9A6] rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-[#027A48] shrink-0" />
            <p className="text-sm font-semibold text-[#027A48]">
              Website updated successfully!
            </p>
          </div>
        )}

        {error && (
          <p className="mx-6 mb-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="px-6 pb-2 space-y-5">
          {/* Website Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-2">
              Website Name
            </label>
            <div className="flex items-center gap-3 border border-[#e9eaeb] rounded-xl px-4 py-3">
              <Globe className="w-4 h-4 text-secondary shrink-0" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Startup"
                className="flex-1 text-sm text-[#181d27] placeholder:text-[#9DA4AE] bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-2">
              Tagline
            </label>
            <div className="flex items-center gap-3 border border-[#e9eaeb] rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-secondary shrink-0" />
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Build faster with AI tools"
                className="flex-1 text-sm text-[#181d27] placeholder:text-[#9DA4AE] bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-2">
              Description
            </label>
            <div className="flex items-start gap-3 border border-[#e9eaeb] rounded-xl px-4 py-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A platform for developers"
                rows={3}
                className="flex-1 text-sm text-[#181d27] placeholder:text-[#9DA4AE] bg-transparent outline-none resize-none"
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-2">
              Country
            </label>
            <div className="border border-[#e9eaeb] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-white cursor-pointer hover:bg-[#fafafa]">
                <Layers className="w-5 h-5 text-[#535862] shrink-0" />
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="flex-1 text-sm text-[#181d27] bg-transparent outline-none cursor-pointer appearance-none"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-2">
              Industry
            </label>
            <div className="border border-[#e9eaeb] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-white cursor-pointer hover:bg-[#fafafa]">
                <Layers className="w-5 h-5 text-[#535862] shrink-0" />
                <select
                  value={marketplaceCategoryId}
                  onChange={(e) => {
                    setMarketplaceCategoryId(e.target.value);
                    setSecondaryMarketplaceCategoryIds([]);
                  }}
                  className="flex-1 text-sm text-[#181d27] bg-transparent outline-none cursor-pointer appearance-none"
                >
                  <option value="" disabled>Select an industry</option>
                  {primaryCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Secondary Categories */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-2">
              Category
            </label>
            <div className="border border-[#e9eaeb] rounded-xl overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3 bg-white">
                <Layers className="w-5 h-5 text-[#535862] shrink-0 mt-1" />
                <MultiSelectDropdown
                  options={secondaryCategories}
                  selectedIds={secondaryMarketplaceCategoryIds}
                  onChange={(selected) => setSecondaryMarketplaceCategoryIds(selected)}
                  disabled={!marketplaceCategoryId || secondaryCategories.length === 0}
                  placeholder="Select categories"
                />
              </div>
            </div>
          </div>

          {/* Logo Key */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-2">
              Logo Key (S3 Key)
            </label>
            <div className="flex items-center gap-3 border border-[#e9eaeb] rounded-xl px-4 py-3">
              <Globe className="w-4 h-4 text-secondary shrink-0" />
              <input
                type="text"
                value={logoKey}
                onChange={(e) => setLogoKey(e.target.value)}
                placeholder="b1_9a2f1b8415412"
                className="flex-1 text-sm text-[#181d27] placeholder:text-[#9DA4AE] bg-transparent outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-[#175CD3] shrink-0 mt-0.5" />
            <p className="text-sm text-[#175CD3] leading-relaxed">
              Updating your website details will not affect verification status
              or existing tasks.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-[#e9eaeb] flex flex-col gap-4 md:flex-row items-center justify-between mt-4">
          <button
            onClick={handleClose}
            className="text-sm font-semibold text-[#535862] hover:text-[#181d27] tracking-wide transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            className="flex items-center gap-2 bg-secondary hover:bg-[#d94118] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors tracking-wide"
          >
            {isLoading ? "SAVING..." : "SAVE CHANGES"}
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
