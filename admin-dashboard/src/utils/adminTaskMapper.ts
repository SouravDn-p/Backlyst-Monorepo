import type { AdminTaskItem, TaskRecord } from "../redux/feature/task/taskTypes";

const firstValue = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const asText = (value: unknown, fallback = "N/A") => {
  const selected = firstValue(value);
  return selected === undefined ? fallback : String(selected);
};

const asUpperText = (value: unknown, fallback = "N/A") =>
  asText(value, fallback).replace(/_/g, " ").toUpperCase();

const formatDate = (value: unknown) => {
  const raw = firstValue(value);
  if (!raw) return "N/A";
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toISOString().split("T")[0];
};

const formatDateTime = (value: unknown) => {
  const raw = firstValue(value);
  if (!raw) return "N/A";
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return String(raw);
  return `${d.toISOString().replace("T", " ").slice(0, 19)} UTC`;
};

const readSite = (site: any, fallback: unknown) =>
  asUpperText(
    firstValue(
      site?.websiteUrl,
      site?.url,
      site?.domain,
      site?.name,
      site?.title,
      fallback,
    ),
  );

const toCredits = (value: unknown) => {
  const numberValue = Number(firstValue(value, 0));
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const toLifecycle = (item: AdminTaskItem, createdAt: unknown) => {
  const rawItem = item as any;
  const rawLogs = firstValue(rawItem.lifecycle, rawItem.logs, rawItem.auditLogs, rawItem.history);

  if (Array.isArray(rawLogs) && rawLogs.length > 0) {
    return rawLogs.map((log: any) => ({
      event: asUpperText(firstValue(log.event, log.action, log.status, log.title), "TASK EVENT"),
      datetime: formatDateTime(firstValue(log.datetime, log.createdAt, log.timestamp, log.date)),
      node: asUpperText(firstValue(log.node, log.actorRole, log.actor, log.admin?.email), "NODE: GOVERNANCE-NODE"),
    }));
  }

  return [
    {
      event: "TASK CREATED",
      datetime: formatDateTime(createdAt),
      node: "NODE: REQUESTER-NODE",
    },
  ];
};

export const toTaskRecord = (item: AdminTaskItem, index: number): TaskRecord => {
  const rawItem = item as any;
  const createdAt = firstValue(item.createdAt, rawItem.created, rawItem.createdDate, rawItem.submittedAt);
  const credits = toCredits(
    firstValue(item.credits?.amount, rawItem.credit, rawItem.cost, rawItem.price, rawItem.escrowCredits, rawItem.taskCredits),
  );
  const status = asUpperText(firstValue(item.status?.label, item.status?.code, rawItem.currentStatus, rawItem.taskStatus), "PENDING");
  const urlState = asUpperText(firstValue(item.destination?.status, rawItem.urlStatus, rawItem.linkStatus, rawItem.destinationUrlStatus));

  return {
    taskId: asText(firstValue(item.taskId, rawItem.taskNumber, rawItem.referenceId, rawItem.id, rawItem._id), `T-${index + 1}`),
    created: formatDate(createdAt),
    sourceSite: readSite(
      firstValue(item.sites?.source, rawItem.sourceSite, rawItem.sourceWebsite, rawItem.postingSite, rawItem.providerWebsite),
      firstValue(item.sites?.source?.name, rawItem.sourceSiteName, rawItem.postingSiteName, rawItem.providerDomain),
    ),
    sourceOrg: asUpperText(firstValue(item.sites?.source?.label, rawItem.sourceOrgName, rawItem.providerName, rawItem.publisherName), "N/A"),
    targetSite: readSite(
      firstValue(item.sites?.target, rawItem.targetSite, rawItem.targetWebsite, rawItem.receivingSite, rawItem.requesterWebsite),
      firstValue(item.sites?.target?.name, rawItem.targetSiteName, rawItem.receivingSiteName, rawItem.requesterDomain),
    ),
    targetOrg: asUpperText(firstValue(item.sites?.target?.label, rawItem.targetOrgName, rawItem.requesterName, rawItem.clientName), "N/A"),
    destinationUrl: asText(firstValue(item.destination?.url, rawItem.destinationUrl, rawItem.targetUrl, rawItem.url, rawItem.linkUrl), "N/A"),
    urlStatus: urlState === "ACTIVE" || status === "COMPLETED" ? "ACTIVE" : "INACTIVE",
    taskType: asUpperText(firstValue(item.typeAttr?.type, rawItem.placementType, rawItem.taskType, rawItem.type), "N/A"),
    linkAttr: asUpperText(firstValue(item.typeAttr?.attribute, rawItem.linkAttribute, rawItem.linkAttr, rawItem.attribute), "N/A"),
    credits,
    status,
    statusDetail: item.status?.sublabel || (status === "DISPUTED" ? "DISPUTE FLAGGED" : undefined),
    escrowValue: asText(firstValue(rawItem.escrowValue, rawItem.escrowDisplay), `${credits.toLocaleString()} ${item.credits?.unit || "CR"}`),
    verificationSignal: asUpperText(firstValue(rawItem.verificationSignal, rawItem.verificationStatus, rawItem.deliveryStatus), status),
    lifecycle: toLifecycle(item, createdAt),
  };
};

export const getTaskStatusStyle = (status: string) => {
  if (status === "COMPLETED" || status.includes("ACCEPTED"))
    return { bg: "#F0FDF4", text: "#008236", dot: "#008236" };
  if (status === "DISPUTED")
    return { bg: "#FEF2F2", text: "#FB2C36", dot: "#FB2C36" };
  if (status === "PENDING")
    return { bg: "#F3F4F6", text: "#364153", dot: "" };
  return { bg: "#F3F4F6", text: "#364153", dot: "" };
};
