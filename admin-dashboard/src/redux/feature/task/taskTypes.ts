export type AdminTaskListParams = {
  status?: string;
  search?: string;
  placementType?: string;
  linkAttribute?: string;
  deadlineStatus?: string;
  page?: number;
  limit?: number;
};

export type AdminTaskItem = {
  taskId: string;
  createdAt: string;
  sites: {
    source: {
      id: string | null;
      name: string | null;
      label: string | null;
    };
    target: {
      id: string | null;
      name: string | null;
      label: string | null;
    };
  };
  destination: {
    url: string;
    status: string;
  };
  typeAttr: {
    type: string;
    attribute: string;
  };
  credits: {
    amount: number;
    unit: string;
  };
  status: {
    code: string;
    label: string;
    sublabel: string | null;
    tone: string;
  };
  authorityAction: {
    label: string;
    providerId: string | null;
    enabled: boolean;
  };
};

export type AdminTaskListResponse = {
  success: boolean;
  message: string;
  data: {
    items: AdminTaskItem[];
    meta: {
      currentPage: number;
      perPage: number;
      totalItems: number;
      totalPages: number;
      pageItemCount: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
};

export type TaskRecord = {
  taskId: string;
  created: string;
  sourceSite: string;
  sourceOrg: string;
  targetSite: string;
  targetOrg: string;
  destinationUrl: string;
  urlStatus: "ACTIVE" | "INACTIVE";
  taskType: string;
  linkAttr: string;
  credits: number;
  status: string;
  statusDetail?: string;
  escrowValue: string;
  verificationSignal: string;
  lifecycle: {
    event: string;
    datetime: string;
    node: string;
  }[];
};

// ─── Admin Task Action ────────────────────────────────────────────────────────

export type AdminTaskAction =
  | "FREEZE"
  | "FORCE_APPROVE"
  | "FORCE_REJECT"
  | "CREDIT_REFUND"
  | "CREDIT_REVERSE"
  | "RESOLVE_DISPUTE"
  | "FLAG_ABUSE";

export type AdminTaskActionRequest = {
  taskId: string;
  action: AdminTaskAction;
  reason: string;
  amount?: number;
  disputeResolution?: "REQUEST_REVISION" | "APPROVE" | "REJECT";
};

export type AdminTaskActionResponse = {
  success: boolean;
  message: string;
  data: Record<string, unknown>;
};