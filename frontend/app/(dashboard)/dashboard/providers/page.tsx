"use client";

import { useState } from "react";
import { Search, Filter, Check, ChevronDown, ChevronRight, CircleAlert } from "lucide-react";
import ProviderCard from "@/components/dashboard/provider/profile/ProviderCard";
import ProviderProfileModal from "@/components/dashboard/provider/profile/ProviderProfileModal";
import { useGetCompaniesQuery } from "@/redux/features/api/company/companyDirectoryApi";
import { useGetWebsiteCategoryKeysQuery } from "@/redux/features/api/website/websiteApi";
import type {
  CompanyDirectoryCompany,
  CompanyProviderCard,
} from "@/types/company/companyDirectoryTypes";

interface Country {
  name: string;
  flag: string;
  checked: boolean;
}

const countries: Country[] = [
  ["Albania", "🇦🇱"], ["Andorra", "🇦🇩"], ["Armenia", "🇦🇲"],
  ["Austria", "🇦🇹"], ["Azerbaijan", "🇦🇿"], ["Belarus", "🇧🇾"],
  ["Belgium", "🇧🇪"], ["Bosnia and Herzegovina", "🇧🇦"], ["Bulgaria", "🇧🇬"],
  ["Canada", "🇨🇦"], ["Croatia", "🇭🇷"], ["Cyprus", "🇨🇾"],
  ["Czech Republic", "🇨🇿"], ["Denmark", "🇩🇰"], ["Estonia", "🇪🇪"],
  ["Finland", "🇫🇮"], ["France", "🇫🇷"], ["Georgia", "🇬🇪"],
  ["Germany", "🇩🇪"], ["Greece", "🇬🇷"], ["Hungary", "🇭🇺"],
  ["Iceland", "🇮🇸"], ["Ireland", "🇮🇪"], ["Italy", "🇮🇹"],
  ["Kazakhstan", "🇰🇿"], ["Kosovo", "🇽🇰"], ["Latvia", "🇱🇻"],
  ["Liechtenstein", "🇱🇮"], ["Lithuania", "🇱🇹"], ["Luxembourg", "🇱🇺"],
  ["Malta", "🇲🇹"], ["Moldova", "🇲🇩"], ["Monaco", "🇲🇨"],
  ["Montenegro", "🇲🇪"], ["Netherlands", "🇳🇱"], ["North Macedonia", "🇲🇰"],
  ["Norway", "🇳🇴"], ["Poland", "🇵🇱"], ["Portugal", "🇵🇹"],
  ["Romania", "🇷🇴"], ["Russia", "🇷🇺"], ["San Marino", "🇸🇲"],
  ["Serbia", "🇷🇸"], ["Slovakia", "🇸🇰"], ["Slovenia", "🇸🇮"],
  ["Spain", "🇪🇸"], ["Sweden", "🇸🇪"], ["Switzerland", "🇨🇭"],
  ["Turkey", "🇹🇷"], ["Ukraine", "🇺🇦"], ["United Kingdom", "🇬🇧"],
  ["USA", "🇺🇸"], ["Vatican City", "🇻🇦"],
].map(([name, flag]) => ({ name, flag, checked: false }));

const avatarColors = ["#6366f1", "#06b6d4", "#f97316", "#8b5cf6", "#3b82f6"];

const toProviderCard = (
  company: CompanyDirectoryCompany,
  index: number,
): CompanyProviderCard => {
  const displayName = company.companyName || company.name;
  const websiteUrl = company.companyWebsite || "";

  return {
    id: company.id,
    name: displayName,
    avatar: displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase(),
    avatarBg: avatarColors[index % avatarColors.length],
    verified: company.publisher?.isVerified ?? false,
    rating: company.ratingSummary?.averageRating ?? 0,
    reviews: company.ratingSummary?.totalReviews ?? 0,
    website: websiteUrl
      ? websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
      : "WEBSITE NOT AVAILABLE",
    websiteUrl,
    domainRating: Math.round(company.stats?.averageDomainRating ?? 0),
    industryTag: company.companyIndustry || company.businessType || "GENERAL",
    tags: company.publisher?.tags?.slice(0, 2) ?? [],
  };
};


export default function CompanyDirectory() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [countrySearch, setCountrySearch] = useState("");
  const [industrySearch, setIndustrySearch] = useState("");
  const [selectedCountries, setSelectedCountries] =
    useState<Country[]>(countries);
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());
  const [selectedProvider, setSelectedProvider] =
    useState<CompanyProviderCard | null>(null);

  const { data: categoryResponse } = useGetWebsiteCategoryKeysQuery();
  const primaryCategories = categoryResponse?.data?.filter((c) => c.parentId === null) || [];

  const selectedCountryNames = selectedCountries
    .filter((country) => country.checked)
    .map((country) => country.name);
  const selectedIndustryNames = Array.from(selectedIndustries);

  const { data: companiesResponse, isLoading, isError } = useGetCompaniesQuery({
    search: searchQuery.trim() || undefined,
    country: selectedCountryNames.length ? selectedCountryNames.join(",") : undefined,
    industry: selectedIndustryNames.length ? selectedIndustryNames.join(",") : undefined,
    page: 1,
    limit: 100,
    sortBy: "qualityScore",
    order: "desc",
  });

  const toggleCountry = (idx: number) =>
    setSelectedCountries((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, checked: !c.checked } : c)),
    );
    
  const toggleIndustry = (slug: string) => {
    setSelectedIndustries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(slug)) newSet.delete(slug);
      else newSet.add(slug);
      return newSet;
    });
  };

  const toggleExpanded = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    setExpandedIndustries((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const filtered = (companiesResponse?.data?.data ?? []).map(toProviderCard);

  const visibleCountries = selectedCountries.filter((country) =>
    country.name.toLowerCase().includes(countrySearch.trim().toLowerCase()),
  );
  const visibleIndustries = primaryCategories.filter((cat) =>
    cat.name.toLowerCase().includes(industrySearch.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
      <div className=" flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-[#181d27]">
              Company Directory
            </h1>
            <p className="text-md lg:text-base font-medium text-[#535862] mt-1">
              Discover and evaluate elite providers to understand quality and
              trust before starting your next campaign.
            </p>
          </div>
          <div className="bg-[#f5f5f5] rounded-xl p-3 flex items-start lg:items-center gap-2.5">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0">
              <CircleAlert className="w-4 h-4 text-[#2AB516]" />
            </div>
            <p className="text-sm lg:text-md text-[#535862]">
              Browse vetted providers to understand quality and trust before
              creating a placement task. All hiring and fulfillment happens
              exclusively through the task-based workflow.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="hidden lg:flex w-56 xl:w-64 bg-white rounded-[20px] p-5 flex-col gap-5 h-fit shrink-0">
            <div className="flex items-center justify-between h-7">
              <div className="flex items-center gap-1.5">
                <Filter className="w-5 h-5 text-[#414651]" />
                <span className="text-base font-bold text-[#414651]">
                  Filters
                </span>
              </div>
              <button
                className="text-sm font-bold text-[#717680] hover:text-[#fd751f] transition-colors"
                onClick={() => {
                  setSelectedCountries(countries.map((c) => ({ ...c, checked: false })));
                  setSelectedIndustries(new Set());
                  setExpandedIndustries(new Set());
                }}
              >
                RESET
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold text-[#fd751f] uppercase tracking-widest">
                Country
              </p>
              <div className="bg-[#f5f5f5] border border-[#e9eaeb] rounded p-1.5 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-[#a4a7ae]" />
                <input
                  type="text"
                  placeholder="Type here..."
                  className="text-sm text-[#a4a7ae] bg-transparent outline-none flex-1"
                  value={countrySearch}
                  onChange={(event) => setCountrySearch(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2.5 max-h-36 overflow-y-auto">
                {visibleCountries.map((c) => {
                  const idx = selectedCountries.findIndex(
                    (country) => country.name === c.name,
                  );
                  return (
                  <label
                    key={c.name}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleCountry(idx)}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${c.checked ? "bg-[#fff1e9] border-[#fd751f]" : "bg-[#fafafa] border-[#d5d7da]"}`}
                    >
                      {c.checked && (
                        <Check className="w-2.5 h-2.5 text-[#fd751f]" />
                      )}
                    </div>
                    <span className="text-sm text-[#1e242c]">{c.name}</span>
                    <span className="text-sm ml-auto">{c.flag}</span>
                  </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold text-[#fd751f] uppercase tracking-widest">
                Company Industry
              </p>
              <div className="bg-[#f5f5f5] border border-[#e9eaeb] rounded p-1.5 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-[#a4a7ae]" />
                <input
                  type="text"
                  placeholder="Search by title..."
                  className="text-sm text-[#a4a7ae] bg-transparent outline-none flex-1"
                  value={industrySearch}
                  onChange={(event) => setIndustrySearch(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {visibleIndustries.map((ind) => {
                  const subCategories = categoryResponse?.data?.filter((c) => c.parentId === ind.id) || [];
                  const isExpanded = expandedIndustries.has(ind.slug);
                  const isChecked = selectedIndustries.has(ind.slug);

                  return (
                    <div key={ind.slug} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {subCategories.length > 0 ? (
                          <button
                            type="button"
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${ind.name}`}
                            onClick={(event) => toggleExpanded(event, ind.slug)}
                            className="rounded p-0.5 hover:bg-gray-100"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                            )}
                          </button>
                        ) : (
                          <span className="w-[18px]" />
                        )}
                        <button
                          type="button"
                          aria-pressed={isChecked}
                          onClick={() => toggleIndustry(ind.slug)}
                          className="flex items-center gap-2 text-left"
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-[#fff1e9] border-[#fd751f]" : "bg-[#fafafa] border-[#d5d7da]"}`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 text-[#fd751f]" />}
                          </span>
                          <span className="text-sm text-[#1e242c]">{ind.name}</span>
                        </button>
                      </div>

                      {isExpanded && subCategories.map((sub) => {
                        const isSubChecked = selectedIndustries.has(sub.slug);
                        return (
                          <button
                            key={sub.slug}
                            type="button"
                            aria-pressed={isSubChecked}
                            className="ml-8 flex items-center gap-2 text-left"
                            onClick={() => toggleIndustry(sub.slug)}
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSubChecked ? "bg-[#fff1e9] border-[#fd751f]" : "bg-[#fafafa] border-[#d5d7da]"}`}
                            >
                              {isSubChecked && <Check className="w-2.5 h-2.5 text-[#fd751f]" />}
                            </span>
                            <span className="text-sm text-[#1e242c]">{sub.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#fd751f] uppercase tracking-widest">
                  Min. Domain Rating
                </p>
                <div className="bg-[#ebffe9] px-2 py-0.5 rounded">
                  <span className="text-[10px] font-semibold text-[#2ab516]">
                    50+
                  </span>
                </div>
              </div>
              <div className="relative h-1.5 bg-[#f0f0f0] rounded-full">
                <div className="absolute left-0 top-0 h-full w-1/2 bg-[#2ab516] rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[#2ab516] rounded-full shadow-md border-2 border-white cursor-pointer" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold text-[#fd751f] uppercase tracking-widest">
                Authority Rating
              </p>
              <div className="bg-[#f9f9f9] border border-[#f0f0f0] rounded-lg p-2.5 flex items-center justify-between cursor-pointer">
                <span className="text-sm font-semibold text-[#414651]">
                  ALL Ratings
                </span>
                <ChevronDown className="w-4 h-4 text-[#414651]" />
              </div>
            </div>

            <button className="w-full bg-[#fd751f] hover:bg-[#e65c00] transition-colors text-white font-bold text-md py-2.5 rounded-lg">
              APPLY FILTER
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="bg-white rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex-1 bg-[#f5f5f5] border border-[#e9eaeb] rounded p-2.5 flex items-center gap-2">
                <Search className="w-5 h-5 text-[#a4a7ae] shrink-0" />
                <input
                  type="text"
                  placeholder="Search by site, ID, or title..."
                  className="text-md font-medium text-[#a4a7ae] bg-transparent outline-none flex-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-sm font-semibold text-[#414651] uppercase tracking-wide">
                  Sort by:
                </span>
                <button className="flex items-center gap-1 text-sm font-semibold text-[#fd751f]">
                  Top Rated <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  onViewProfile={setSelectedProvider}
                />
              ))}
            </div>

            {isLoading && (
              <div className="py-20 text-center text-[#717680]">
                Loading companies...
              </div>
            )}

            {isError && !isLoading && (
              <div className="py-20 text-center text-[#535862]">
                Unable to load companies. Please try again.
              </div>
            )}

            {!isLoading && !isError && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-10 h-10 text-[#d5d7da] mb-3" />
                <p className="text-[#535862] font-medium">
                  No providers match your search
                </p>
                <p className="text-md text-[#a4a7ae] mt-1">
                  Try a different keyword
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedProvider && (
        <ProviderProfileModal
          open={selectedProvider ? true : false}
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
        />
      )}
    </div>
  );
}
