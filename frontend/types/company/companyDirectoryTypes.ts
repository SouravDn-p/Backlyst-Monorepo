export interface CompanyBadge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  earnedAt: string;
}

export interface CompanyPublisher {
  id: string;
  nicheSpecialization: string | null;
  bio: string | null;
  tags: string[];
  isVerified: boolean;
}

export interface CompanyRatingSummary {
  averageRating: number;
  totalReviews: number;
}

export interface CompanyStats {
  activeDomains?: number;
  verifiedDomains?: number;
  averageDomainRating: number;
  platformSuccessRate: number;
  averageResponseTime: number;
}

export interface CompanyQualityFulfillment {
  overallQualityScore: number;
  completionRatePercentage: number;
  reliabilityScore: number;
  behaviourScore: number;
  completedInteractions: number;
  failedInteractions: number;
}

export interface CompanyAuthorityMetrics {
  averageDomainRating: number;
  averageSpamScore: number;
}

export interface CompanyVerifiedSample {
  id: string;
  taskId: string;
  projectTitle: string | null;
  targetUrl: string | null;
  anchorText: string | null;
  finalTaskType: string | null;
  linkAttribute: string | null;
  responsibilityType: string | null;
  websiteId: string | null;
  websiteName: string | null;
  websiteUrl: string | null;
  proofDocuments: string[];
  status: string;
  verifiedAt: string | null;
}

export interface CompanyWebsite {
  id: string;
  name: string;
  websiteUrl: string;
  rootDomain: string | null;
  domainRating: number | null;
  verificationStatus: string;
  country: string | null;
  primaryNiche: string | null;
  categories: string[];
  tags: string[];
}

export interface CompanyDirectoryCompany {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  country: string | null;
  phoneNumber: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
  businessType: string | null;
  vatUid: string | null;
  badges: CompanyBadge[];
  ratingSummary: CompanyRatingSummary;
  publisher: CompanyPublisher | null;
  overallQualityScore: number;
  completionRatePercentage: number;
  reliabilityScore: number;
  stats: CompanyStats;
  createdAt: string;
}

export interface CompanyDirectoryDetail extends CompanyDirectoryCompany {
  qualityFulfillment: CompanyQualityFulfillment;
  authorityMetrics: CompanyAuthorityMetrics;
  placementFormats: string[];
  recentReviews: unknown[];
  verifiedSamples: CompanyVerifiedSample[];
  websites: CompanyWebsite[];
}

export interface CompanyDirectoryMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CompanyDirectoryResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data: {
    data: CompanyDirectoryCompany[];
    meta: CompanyDirectoryMeta;
  };
}

export interface CompanyDetailResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data: CompanyDirectoryDetail;
}

export interface GetCompaniesParams {
  search?: string;
  industry?: string;
  nicheSpecialization?: string;
  country?: string;
  page?: number;
  limit?: number;
  sortBy?: "qualityScore" | "averageRating" | "platformSuccessRate" | "createdAt";
  order?: "asc" | "desc";
}

export interface CompanyProviderCard {
  id: string | number;
  name: string;
  avatar: string;
  avatarBg: string;
  verified: boolean;
  rating: number;
  reviews: number;
  website: string;
  websiteUrl: string;
  domainRating: number;
  industryTag: string;
  tags: string[];
}
