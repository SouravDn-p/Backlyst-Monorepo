"use client";

import type { ReactNode } from "react";
import type {
  RequesterTaskDeadlineDays,
  RequesterTaskLinkAttribute,
  RequesterTaskPlacementType,
  RequesterTaskWalletType,
} from "@/types/requesterTask/requesterTaskTypes";

export interface PlacementOption {
  id: RequesterTaskPlacementType;
  icon: ReactNode;
  label: string;
  desc: string;
  recommended?: boolean;
}

export interface TaskFormValues {
  requesterWebsiteId: string;
  projectTitle: string;
  targetUrl: string;
  anchorText: string;
  placementGuidelines: string;
  requiredDomainRating: string;
  placementType: RequesterTaskPlacementType;
  linkAttribute: RequesterTaskLinkAttribute;
  requestedDeadlineDays: `${RequesterTaskDeadlineDays}`;
  walletType: RequesterTaskWalletType;
}

export type TaskFormField = keyof TaskFormValues | "files";
