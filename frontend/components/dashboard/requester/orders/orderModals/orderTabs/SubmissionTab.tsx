import { ChevronRight, ExternalLink, FileText, Image as ImageIcon } from "lucide-react";
import type {
  RequesterTask,
  RequesterTaskLifecycleStatus,
  RequesterTaskSubmissionStatus,
} from "@/types/requesterTask/requesterTaskTypes";

type Props = {
  task?: RequesterTask | null;
  workflowStatus?: RequesterTaskLifecycleStatus | null;
};

function getSubmissionStageCopy(
  workflowStatus?: RequesterTaskLifecycleStatus | null,
  submissionStatus?: RequesterTaskSubmissionStatus | null,
): { title: string; description: string } {
  if (
    workflowStatus === "SUBMITTED" ||
    submissionStatus === "SUBMITTED"
  ) {
    return {
      title: "Submission Ready",
      description: "The provider has submitted work and it is ready for review.",
    };
  }

  if (
    workflowStatus === "REVISION_REQUESTED" ||
    submissionStatus === "REVISION_REQUESTED"
  ) {
    return {
      title: "Revision Requested",
      description:
        "A revision has been requested. The provider is preparing an updated submission.",
    };
  }

  return {
    title: "Awaiting Submission",
    description: "The provider has not submitted the work yet.",
  };
}

export default function SubmissionTab({ task, workflowStatus }: Props) {
  const stageCopy = getSubmissionStageCopy(
    workflowStatus ?? task?.lifecycleStatus ?? null,
    task?.submissionStatus ?? null,
  );
  const isSubmitted =
    workflowStatus === "SUBMITTED" ||
    task?.submissionStatus === "SUBMITTED" ||
    workflowStatus === "APPROVED" ||
    workflowStatus === "COMPLETED";
  const message =
    task?.deliveryMessage?.trim() ||
    task?.providerNote?.trim() ||
    stageCopy.description;
  const submissionLink = task?.liveLinkUrl || task?.proofUrl || task?.targetUrl;
  const proofDocuments = task?.providerProofDocuments ?? [];
  const attachments = task?.files ?? [];
  const submissionStatus =
    workflowStatus?.replaceAll("_", " ") ||
    task?.submissionStatus?.replaceAll("_", " ") ||
    "NOT SUBMITTED";

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3">
          Current Stage
        </h3>
        <div className="rounded-xl border border-[#B2DDFF] bg-[#EFF8FF] px-5 py-4">
          <p className="text-sm font-semibold text-[#175CD3]">{stageCopy.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#175CD3]">
            {stageCopy.description}
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3">
          Provider Message
        </h3>
        <div className="bg-[#FFF4ED] border border-[#FDCFBE] rounded-xl px-5 py-4">
          <p className="text-sm text-[#535862] italic leading-relaxed">
            {message}
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3">
          Submitted Link
        </h3>
        <div className="border border-[#e9eaeb] rounded-xl overflow-hidden">
          {submissionLink ? (
            <a
              href={submissionLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/50 transition"
            >
              <ExternalLink className="w-5 h-5 text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#181d27] truncate">
                  {submissionLink}
                </p>
                <p className="text-xs font-bold text-[#027A48] uppercase tracking-wide mt-0.5">
                  Submission Status: {submissionStatus}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-secondary" />
            </a>
          ) : (
            <div className="flex items-center gap-3 px-4 py-4">
              <ExternalLink className="w-5 h-5 text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#181d27] truncate">
                  No link submitted yet
                </p>
                <p className="text-xs font-bold text-[#027A48] uppercase tracking-wide mt-0.5">
                  Submission Status: {submissionStatus}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {proofDocuments.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3">
            Provider Proof
          </h3>
          <div className="space-y-3">
            {proofDocuments.map((document, index) => {
              const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(document);

              return (
                <a
                  key={`${document}-${index}`}
                  href={document}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-[#e9eaeb] px-4 py-3 hover:border-secondary/40 transition-colors"
                >
                  {isImage ? (
                    <ImageIcon className="w-5 h-5 text-secondary shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-secondary shrink-0" />
                  )}
                  <span className="text-sm font-medium text-[#181d27] truncate">
                    Proof Document {index + 1}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {attachments.length > 0 ? (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3">
            Uploaded Files
          </h3>
          <div className="space-y-3">
            {attachments.map((file, index) => {
              const href = file.fileUrl || file.url;
              const label =
                file.fileName || file.name || `Attachment ${index + 1}`;

              return href ? (
                <a
                  key={`${label}-${index}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-[#e9eaeb] px-4 py-3 hover:border-secondary/40 transition-colors"
                >
                  <FileText className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-sm font-medium text-[#181d27] truncate">
                    {label}
                  </span>
                </a>
              ) : (
                <div
                  key={`${label}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-[#e9eaeb] px-4 py-3"
                >
                  <FileText className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-sm font-medium text-[#181d27] truncate">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : proofDocuments.length === 0 ? (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3">
            Screenshot Proof
          </h3>
          <div className="border border-dashed border-[#e9eaeb] rounded-xl bg-[#f9fafb] flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="w-10 h-10 text-[#d1d5db]" />
            <p className="text-sm text-[#9DA4AE]">
              {isSubmitted
                ? "Proof is currently not available"
                : "Screenshot not available yet"}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
