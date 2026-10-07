// ─── Shared ───────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── 1. Consent Records ───────────────────────────────────────────────────────

export type ConsentStatus =
  | "CURRENT"
  | "RE_ACCEPTANCE_PENDING"
  | "LEGAL_DOCUMENT_NOT_CONFIGURED";

export interface ConsentItem {
  userId: string;
  entityIdentity: string;
  userName: string;
  email: string;
  termsAcceptance: string;
  privacyAcceptance: string;
  versionTrackingDate: string;
  status: ConsentStatus;
}

export interface ActiveVersionInfo {
  version: string;
  publishedAt: string;
}

export interface ConsentData {
  activeVersions: {
    terms: ActiveVersionInfo | null;
    privacy: ActiveVersionInfo | null;
  };
  items: ConsentItem[];
  meta: PaginationMeta;
}

export type ConsentResponse = ApiResponse<ConsentData>;

// ─── 2. Governance Records ────────────────────────────────────────────────────

export interface GovernanceAdmin {
  id: string;
  name: string;
  email: string;
}

export interface GovernanceSuspension {
  startsAt: string | null;
  endsAt: string | null;
}

export interface GovernanceItem {
  referenceId: string;
  userId: string;
  entityIdentity: string;
  email: string;
  accountStatus: string;
  governanceNote: string;
  punishmentReason: string | null;
  suspension: GovernanceSuspension | null;
  admin: GovernanceAdmin;
  createdAt: string;
}

export interface GovernanceData {
  items: GovernanceItem[];
  meta: PaginationMeta;
}

export type GovernanceResponse = ApiResponse<GovernanceData>;

// ─── 3. Abuse Reports ─────────────────────────────────────────────────────────

export interface AbuseReporter {
  id: string;
  name: string;
  email: string;
}

export interface AbuseReviewedBy {
  id: string;
  name: string;
  email: string;
}

export interface AbuseSourceUser {
  id: string;
  name: string;
  email: string;
}

export interface AbuseSource {
  messageId: string | null;
  taskId: string | null;
  contextType: string | null;
  recordType: string | null;
  registryStatus: string | null;
  registryReason: string | null;
  sender: AbuseSourceUser | null;
  receiver: AbuseSourceUser | null;
}

export interface AbuseReportItem {
  referenceId: string;
  type: string;
  status: string;
  note: string | null;
  reviewAction: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reporter: AbuseReporter;
  reviewedBy: AbuseReviewedBy | null;
  source: AbuseSource | null;
}

export interface AbuseReportData {
  items: AbuseReportItem[];
  meta: PaginationMeta;
}

export type AbuseReportResponse = ApiResponse<AbuseReportData>;

// ─── 4. Task Disputes ─────────────────────────────────────────────────────────

export interface DisputeParty {
  id: string;
  name: string;
  email: string;
  companyName: string;
}

export interface DisputeActor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DisputeTransition {
  from: string;
  to: string;
}

export interface TaskDisputeItem {
  referenceId: string;
  taskId: string;
  projectTitle: string;
  type: string;
  currentTaskStatus: string;
  transition: DisputeTransition;
  actionTaken: string;
  note: string | null;
  metadata: Record<string, unknown>;
  requester: DisputeParty;
  provider: DisputeParty;
  actor: DisputeActor;
  actorRole: string;
  createdAt: string;
}

export interface TaskDisputeData {
  items: TaskDisputeItem[];
  meta: PaginationMeta;
}

export type TaskDisputeResponse = ApiResponse<TaskDisputeData>;

// ─── 5. Financial Records ─────────────────────────────────────────────────────

export interface FinancialUser {
  id: string;
  entityIdentity: string;
  name: string;
  email: string;
}

export interface FinancialWebsite {
  id: string;
  name: string;
  websiteUrl: string;
}

export interface FinancialSubscription {
  plan: { name: string };
  status: string;
  startDate: string | null;
  endDate: string | null;
}

export interface FinancialRecordItem {
  referenceId: string;
  internalRecordId: string;
  externalReference: string | null;
  recordType: string;
  recordStatus: string;
  creditType: string;
  action: string;
  reason: string;
  creditAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  user: FinancialUser;
  website: FinancialWebsite | null;
  subscription: FinancialSubscription | null;
}

export interface FinancialData {
  items: FinancialRecordItem[];
  meta: PaginationMeta;
  disclosure: string;
}

export type FinancialResponse = ApiResponse<FinancialData>;

// ─── 6. Legal Docs ────────────────────────────────────────────────────────────

export type LegalDocType =
  | "TERMS_AND_CONDITIONS"
  | "PRIVACY_POLICY"
  | "COOKIE_POLICY"
  | "DATA_PROCESSING_AGREEMENT";

export interface LegalDocVersion {
  id: string;
  version: string;
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocItem {
  id: string;
  type: LegalDocType;
  title: string;
  activeVersionId: string | null;
  activeVersion: LegalDocVersion | null;
  latestVersion: LegalDocVersion | null;
  totalVersions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocListData {
  meta: PaginationMeta;
  data: LegalDocItem[];
}

export type LegalDocListResponse = ApiResponse<LegalDocListData>;

// Create legal doc request/response
export interface CreateLegalDocRequest {
  type: LegalDocType;
  content: string;
  version: string;
}

export interface CreatedLegalDocVersion {
  id: string;
  documentId: string;
  version: string;
  content: string;
  isActive: boolean;
  createdByUserId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateLegalDocResponse = ApiResponse<CreatedLegalDocVersion>;

// Activate response
export type ActivateLegalDocResponse = ApiResponse<CreatedLegalDocVersion>;

// Delete response
export type DeleteLegalDocResponse = ApiResponse<null>;

// ─── Shared query arg ─────────────────────────────────────────────────────────

export interface ComplianceQuery {
  page: number;
  limit: number;
  search?: string;
}

export interface LegalDocsQuery extends ComplianceQuery {
  type?: LegalDocType | "";
  isActive?: boolean;
}
