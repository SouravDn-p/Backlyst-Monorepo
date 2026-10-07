import { ExternalLink, FileText } from "lucide-react";
import { WebsiteTaskViewModel } from "../Viewtaskmodal";

export default function WebsiteViewTaskTabContent({ task }: { task: WebsiteTaskViewModel }) {
  const notes = [
    {
      label: "Placement Guidelines",
      value: task.placementGuidelines || "No extra placement guidelines were provided.",
    },
    { label: "Requested Deadline", value: task.requestedDeadline },
    { label: "Current Provider", value: task.provider },
    { label: "Last Updated", value: task.updatedAt },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#e9eaeb] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3">
          Task Brief
        </p>
        <p className="text-sm leading-relaxed text-[#535862]">
          {task.placementGuidelines ||
            "This task is using the live task API, but no custom guidance was attached yet."}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {notes.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#e9eaeb] bg-[#f9fafb] p-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9DA4AE]">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#181d27]">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-[#e9eaeb] bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#535862]" />
          <p className="text-sm font-bold text-[#181d27]">Submission Assets</p>
        </div>

        <div className="space-y-3">
          <LinkRow
            label="Target URL"
            href={task.targetUrl}
            fallback="No target URL available"
          />
          <LinkRow
            label="Live Link"
            href={task.liveLinkUrl}
            fallback="No live link has been submitted yet"
          />
          <LinkRow
            label="Proof URL"
            href={task.proofUrl}
            fallback="No proof URL has been attached yet"
          />
        </div>
      </section>

      <section className="rounded-xl border border-[#e9eaeb] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3">
          Current Messages
        </p>
        <div className="space-y-3">
          <MessageBlock
            title="Provider Message"
            text={
              task.deliveryMessage ||
              "No provider delivery message is available yet."
            }
          />
          <MessageBlock
            title="Provider Note"
            text={task.providerNote || "No provider note has been added yet."}
          />
        </div>
      </section>
    </div>
  );
}


function LinkRow({
  label,
  href,
  fallback,
}: {
  label: string;
  href?: string | null;
  fallback: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e9eaeb] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9DA4AE]">
          {label}
        </p>
        <p className="mt-1 text-sm text-[#535862]">{href ? "Available" : fallback}</p>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm font-semibold text-secondary hover:underline"
        >
          Open
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span className="text-xs text-[#9DA4AE]">Unavailable</span>
      )}
    </div>
  );
}

function MessageBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[#e9eaeb] bg-[#f9fafb] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#535862]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#535862]">{text}</p>
    </div>
  );
}