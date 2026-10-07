export type LegalDocumentType =
  | "TERMS_AND_CONDITIONS"
  | "PRIVACY_POLICY"
  | "COOKIE_POLICY"
  | "DATA_PROCESSING_AGREEMENT";

export interface LegalDocument {
  document: {
    id: string;
    title: string;
  };
  latestVersion: {
    id: string;
    version: string;
    createdAt: string;
  };
  isLatest: boolean;
  isAccepted: boolean;
  hasAcceptedAnyVersion: boolean;
}

export interface GetLegalDocsResponse {
  success: boolean;
  message: string;
  data: LegalDocument[];
}

export interface AcceptLegalDocResponse {
  success: boolean;
  message: string;
  data: {
    message: string;
    acceptance: {
      id: string;
      userId: string;
      versionId: string;
      acceptedAt: string;
    };
  };
}
