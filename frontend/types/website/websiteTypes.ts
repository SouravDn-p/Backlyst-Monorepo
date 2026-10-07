// Website Types

export enum WebsiteVerificationBy {
  AUTOMATIC = "AUTOMATIC",
  MANUAL_BY_ADMIN = "MANUAL_BY_ADMIN"
}

export enum WebsiteVerificationType {
  HTML_META_TAG = "HTML_META_TAG",
  DNS_TXT_RECORD = "DNS_TXT_RECORD",
  SCREENSHOT_URL = "SCREENSHOT_URL"
}

export enum WebsiteVerificationStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  VERIFICATION_FAILED = "VERIFICATION_FAILED",
  REQUESTED_FOR_MANUAL_REVIEW = "REQUESTED_FOR_MANUAL_REVIEW",
  APPEALED = "APPEALED",
  REJECTED = "REJECTED"
}

export interface WebsiteAuthor {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
}

export interface Website {
  id: string;
  name: string;
  websiteUrl: string;
  industry: string;
  country: string;
  verificationStatus: WebsiteVerificationStatus;
  description: string | null;
  tagline: string | null;
  logoKey: string | null;
  logoUrl: string | null;
  isDeleted: boolean;
  verifiedAt: string | null;
  verifiedMethod: string | null;
  latestVerificationId: string | null;
  createdAt: string;
  updatedAt: string;
  authorId?: string;
  author?: WebsiteAuthor;
  websiteVerifications?: WebsiteVerification[];
}

export interface WebsiteVerification {
  id: string;
  status: WebsiteVerificationStatus;
  type: WebsiteVerificationType;
  createdAt: string;
  updatedAt?: string;
  screenshotUrl?: string;
  rejectReason?: string | null;
  errorMessage?: string | null;
  manualReviewNotes?: string | null;
  website?: {
    id: string;
    name: string;
    websiteUrl: string;
    logoKey: string | null;
    verificationStatus: WebsiteVerificationStatus;
    logoUrl: string | null;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface WebsiteVerificationMeta {
  page: number;
  limit: number;
  filteredCount: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CreateWebsiteRequest {
  name: string;
  websiteUrl: string;
  description?: string;
  tagline?: string;
  industry: string;
  country: string;
  primaryCategoryId?: string;
  marketplaceCategoryId?: string;
  marketplaceTagIds?: string[];
  secondaryMarketplaceCategoryIds?: string[];
}

export interface UpdateWebsiteRequest {
  name?: string;
  description?: string;
  industry?: string;
  country?: string;
  tagline?: string;
  logoKey?: string;
  marketplaceCategoryId?: string;
  secondaryMarketplaceCategoryIds?: string[];
}

export interface GetMyWebsitesRequest {
  page?: number;
  limit?: number;
  verificationStatus?: WebsiteVerificationStatus;
}

export interface DNSVerificationRequest {
  websiteId: string;
}

export interface MetaTagVerificationRequest {
  websiteId: string;
}

export interface ScreenshotVerificationRequest {
  websiteId: string;
  file: File;
}

export interface MetaTagsResponse {
  success: boolean;
  message: string;
  data: {
    metaTag: string;
    metaName?: string;
    metaContent?: string;
    dnsTxt?: string;
  };
}

export interface DNSVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    websiteId: string;
    websiteVerificationId?: string;
    verificationStatus?: WebsiteVerificationStatus;
    verificationType?: string;
    dnsTxtRecord?: string;
  };
}

export interface GetVerificationRequestsRequest {
  page?: number;
  limit?: number;
  type?: WebsiteVerificationType;
  status?: WebsiteVerificationStatus;
}

// Response Types
export interface CreateWebsiteResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    websiteUrl: string;
    industry: string;
    country: string;
    verificationStatus: WebsiteVerificationStatus;
  };
}

export interface GetWebsiteResponse {
  success: boolean;
  message: string;
  data: Website;
}

export interface UpdateWebsiteResponse {
  success: boolean;
  message: string;
  data: Partial<Website>;
}

export interface DeleteWebsiteResponse {
  success: boolean;
  message: string;
}

export interface GetMyWebsitesResponse {
  success: boolean;
  message: string;
  data: {
    data: Website[];
    meta: PaginationMeta;
  };
}

export interface GetWebsiteVerificationDetailsResponse {
  success: boolean;
  message: string;
  data?: WebsiteVerification;
}

export interface RequestVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    websiteId: string;
    websiteVerificationId: string;
  };
}

export interface GetVerificationRequestsResponse {
  success: boolean;
  message: string;
  data: {
    data: WebsiteVerification[];
    meta: WebsiteVerificationMeta;
  };
}

export interface WebsiteCategoryKey {
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  key: string;
}

export interface WebsiteMarketplaceTag {
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  tag: string;
}

export interface WebsiteCategoryKeysResponse {
  success: boolean;
  message: string;
  data: WebsiteCategoryKey[];
}

export interface WebsiteMarketplaceTagsResponse {
  success: boolean;
  message: string;
  data: WebsiteMarketplaceTag[];
}
