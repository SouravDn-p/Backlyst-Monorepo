"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Globe,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Layers,
  ExternalLink,
  Building2,
  Briefcase,
} from "lucide-react";
import logo from "@/public/backlyst-logo.png";
import Image from "next/image";
import {
  useCreateWebsiteMutation,
  useGetWebsiteCategoryKeysQuery,
  useGetWebsiteMarketplaceTagsQuery,
} from "@/redux/features/api/website/websiteApi";
import { CreateWebsiteRequest } from "@/types/website/websiteTypes";
import { useUpdateProfileMutation } from "@/redux/features/api/settings/account/accountSettingsApi";
import { BusinessType } from "@/types/settings/accountSettingsType";
import {
  getPrimaryCategories,
  getSecondaryCategories,
} from "@/config/industryTaxonomy.config";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";


const BUSINESS_TYPES = [
  "INDIVIDUAL",
  "SOLE_PROPRIETORSHIP",
  "PARTNERSHIP",
  "LIMITED_LIABILITY_COMPANY",
  "PRIVATE_LIMITED_COMPANY",
  "PUBLIC_LIMITED_COMPANY",
  "CORPORATION",
  "NON_PROFIT",
  "GOVERNMENT",
  "EDUCATIONAL",
  "OTHER"
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Bangladesh",
  "India",
  "Canada",
  "Australia",
  "Other",
];

const getApiErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error != null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data != null &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }

  return "Failed to create website. Please try again.";
};

const VerifySiteDetailsPage = () => {
  const router = useRouter();
  const [accepted, setAccepted] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [formData, setFormData] = useState<CreateWebsiteRequest>({
    name: "",
    websiteUrl: "",
    industry: "",
    country: "United States",
    primaryCategoryId: "",
    secondaryMarketplaceCategoryIds: [],
  });
  const [error, setError] = useState("");

  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();

  const [createWebsite, { isLoading: isCreatingWebsite }] =
    useCreateWebsiteMutation();
  const {
    data: categoryKeysData,
    isLoading: areCategoriesLoading,
    isError: areCategoriesError,
    refetch: refetchCategories,
  } = useGetWebsiteCategoryKeysQuery();

  const categoryKeys =
    categoryKeysData?.data.filter((category) => category.enabled) ?? [];
  const primaryCategories = getPrimaryCategories(categoryKeys);
  const secondaryCategories = getSecondaryCategories(
    categoryKeys,
    formData.primaryCategoryId
  );

  // Auto-set the legacy industry string based on primary category selection
  useEffect(() => {
    if (formData.primaryCategoryId) {
      const selectedCat = primaryCategories.find(c => c.id === formData.primaryCategoryId);
      if (selectedCat && formData.industry !== selectedCat.name) {
        setFormData(prev => ({ ...prev, industry: selectedCat.name }));
      }
    }
  }, [formData.primaryCategoryId, primaryCategories, formData.industry]);

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name) {
      setError("Website name is required.");
      return;
    }
    if (!formData.websiteUrl) {
      setError("Website URL is required.");
      return;
    }
    if (!formData.primaryCategoryId) {
      setError("Select a primary category.");
      return;
    }
    if (!companyName) {
      setError("Company Name is required.");
      return;
    }
    if (!businessType) {
      setError("Business Type is required.");
      return;
    }

    try {
      const response = await createWebsite({
        ...formData,
        primaryCategoryId: formData.primaryCategoryId || undefined,
        secondaryMarketplaceCategoryIds: formData.secondaryMarketplaceCategoryIds?.length ? formData.secondaryMarketplaceCategoryIds : undefined,
      }).unwrap();
      
      if (response.success) {
        // Only call update profile if fields are filled
        if (companyName || businessType) {
          try {
            await updateProfile({ 
              companyName: companyName || undefined, 
              businessType: (businessType as BusinessType) || undefined 
            }).unwrap();
          } catch (profileErr) {
            console.error("Failed to update profile", profileErr);
            // We still proceed since website was created
          }
        }
        router.push(`/auth/verify-2?websiteId=${response.data.id}`);
      } else {
        setError(response.message || "Failed to create website. Please try again.");
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center py-20 px-4">
      <div className="w-full max-w-172.5 flex flex-col gap-12">
        <div className="flex flex-col items-center gap-8 w-full">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={logo}
              alt="Backlyst"
              className="w-14 h-12 object-contain"
              priority
            />
            <span className="text-[28px] font-semibold font-sora text-gray-900">
              backlyst
            </span>
          </Link>

          <div className="w-full flex flex-col gap-3">
            <div
              className="flex flex-col leading-12 md:flex-row
             items-center justify-between w-full"
            >
              <div className="bg-[#fff1e9] border border-[#fea369] px-2 py-1 rounded-[30px] flex items-center justify-center">
                <span className="text-[#fd751f] text-xs font-medium font-inter">
                  STEP 1 OF 3
                </span>
              </div>
              <h2 className="text-[20px] font-semibold font-inter text-[#181d27] text-center">
                Website Details
              </h2>
              <span className="text-[#535862] font-medium font-inter text-sm uppercase text-center w-[160px]">
                NEXT: VERIFICATION
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#e9eaeb] rounded-full relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-[33%] bg-[#fd751f] rounded-full" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-8 w-full max-w-172.5">
          <div className=" flex justify-center items-center w-16 h-16  bg-[#E0EAFF]! border-b border-[#d5d7da] rounded-[22px] relative overflow-hidden shrink-0">
            <ShieldCheck
              size={56}
              className="text-[#392db9] w-18 bg-[#E0EAFF] p-4 rounded-2xl font-normal"
            />
          </div>

          <div className="space-y-3">
            <h1 className="text-[30px] font-semibold font-sora text-black leading-9.5">
              Connect your website
            </h1>
            <p className="text-[16px] text-[#535862] font-normal font-inter leading-6">
              To begin building or offering placements, we need to index your
              domain&apos;s authority metrics.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-6 text-left">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium font-inter text-[#414651] uppercase"
              >
                WEBSITE NAME
              </Label>
              <div className="relative group">
                <ExternalLink
                  size={20}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                />
                <Input
                  id="name"
                  placeholder="Example Website"
                  className="pl-10 h-11 bg-white border border-[#d5d7da] rounded-lg focus:ring-[#331ffd] focus:border-[#331ffd] transition-all shadow-xs text-[#181d27] placeholder:text-[#717680] text-base"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="url"
                className="text-sm font-medium font-inter text-[#414651] uppercase"
              >
                WEBSITE URL
              </Label>
              <div className="relative group">
                <Globe
                  size={20}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                />
                <Input
                  id="url"
                  placeholder="https://youtube.com"
                  className="pl-10 h-11 bg-white border border-[#d5d7da] rounded-lg focus:ring-[#331ffd] focus:border-[#331ffd] transition-all shadow-xs text-[#181d27] placeholder:text-[#717680] text-base"
                  value={formData.websiteUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, websiteUrl: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label
                  htmlFor="primaryCategoryId"
                  className="text-sm font-medium font-inter text-[#414651] uppercase"
                >
                  INDUSTRY
                </Label>
                <div className="relative group">
                  <Layers
                    size={20}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                  />
                  <select
                    id="primaryCategoryId"
                    className="w-full pl-10 pr-4 h-11 bg-white border border-[#d5d7da] rounded-lg focus:ring-2 focus:ring-[#331ffd] focus:border-transparent transition-all shadow-xs appearance-none font-normal text-base text-[#181d27] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    value={formData.primaryCategoryId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryCategoryId: e.target.value,
                        secondaryMarketplaceCategoryIds: [],
                      })
                    }
                    disabled={areCategoriesLoading || areCategoriesError}
                    required
                  >
                    <option value="">
                      {areCategoriesLoading
                        ? "Loading categories..."
                        : "Select an industry"}
                    </option>
                    {primaryCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#717680]">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="secondaryCategory"
                  className="text-sm font-medium font-inter text-[#414651] uppercase"
                >
                  CATEGORY
                </Label>
                <div className="relative group">
                  <div className="w-full bg-white border border-[#d5d7da] rounded-lg focus-within:ring-2 focus-within:ring-[#331ffd] focus-within:border-transparent transition-all shadow-xs min-h-[44px] flex items-center px-4">
                    <MultiSelectDropdown
                      options={secondaryCategories}
                      selectedIds={formData.secondaryMarketplaceCategoryIds || []}
                      onChange={(selected) => {
                        setFormData({
                          ...formData,
                          secondaryMarketplaceCategoryIds: selected,
                        });
                      }}
                      disabled={!formData.primaryCategoryId || secondaryCategories.length === 0}
                      placeholder="Select categories"
                    />
                  </div>
                </div>
              </div>
            </div>

            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label
                  htmlFor="companyName"
                  className="text-sm font-medium font-inter text-[#414651] uppercase"
                >
                  COMPANY NAME 
                  {/* REMOVED: Made mandatory for strict onboarding */}
                  {/* <span className="text-[#717680] font-normal lowercase">(optional)</span> */}
                </Label>
                <div className="relative group">
                  <Building2
                    size={20}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                  />
                  <Input
                    id="companyName"
                    placeholder="Example Corp"
                    className="pl-10 h-11 bg-white border border-[#d5d7da] rounded-lg focus:ring-[#331ffd] focus:border-[#331ffd] transition-all shadow-xs text-[#181d27] placeholder:text-[#717680] text-base"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="businessType"
                  className="text-sm font-medium font-inter text-[#414651] uppercase"
                >
                  BUSINESS TYPE 
                  {/* REMOVED: Made mandatory for strict onboarding */}
                  {/* <span className="text-[#717680] font-normal lowercase">(optional)</span> */}
                </Label>
                <div className="relative group">
                  <Briefcase
                    size={20}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                  />
                  <select
                    id="businessType"
                    className="w-full pl-10 pr-4 h-11 bg-white border border-[#d5d7da] rounded-lg focus:ring-2 focus:ring-[#331ffd] focus:border-transparent transition-all shadow-xs appearance-none font-normal text-base text-[#181d27] cursor-pointer"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                  >
                    <option value="">Select business type</option>
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#717680]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label
                  htmlFor="country"
                  className="text-sm font-medium font-inter text-[#414651] uppercase"
                >
                  COUNTRY
                </Label>
                <div className="relative group">
                  <MapPin
                    size={20}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                  />
                  <select
                    id="country"
                    className="w-full pl-10 pr-4 h-11 bg-white border border-[#d5d7da] rounded-lg focus:ring-2 focus:ring-[#331ffd] focus:border-transparent transition-all shadow-xs appearance-none font-normal text-base text-[#181d27] cursor-pointer"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    required
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#717680]">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                {/* Placeholder for checkbox */}
             
              <p className="text-sm font-medium text-[#414651]">
                We&apos;ll verify ownership in the next step. Your data is
                encrypted and used for marketplace discovery.
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-4 w-full items-center">
              <Button
                type="submit"
                disabled={isCreatingWebsite || isUpdatingProfile}
                className="w-full py-3 h-auto cursor-pointer bg-[#331ffd] hover:bg-[#2815d6] text-white font-semibold md:text-base rounded-lg shadow-xs transition-all flex gap-2 justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isCreatingWebsite || isUpdatingProfile ? "SAVING..." : "CONTINUE TO CONFIRMATION"} <ArrowRight size={18} />
              </Button>
              {/* 
                REMOVED: The "Skip for now" option was disabled to enforce strict registration. 
                Free tier users are now required to register and verify their company during signup.
                
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="text-sm font-medium text-[#535862] hover:text-gray-800 transition-colors uppercase tracking-widest"
                >
                  SKIP FOR NOW
                </button>
              */}
            </div>

            <div className="flex items-center justify-center gap-8 mt-4">
              <span className="text-sm text-[#717680] font-normal uppercase">
                GDPR COMPLIANT
              </span>
              <span className="text-sm text-[#717680] font-normal uppercase">
                SSL SECURED
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifySiteDetailsPage;