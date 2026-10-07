import { CheckCircle2, Clock, Plus, UserCheck } from "lucide-react";
import type { RequesterTaskTimelineEvent } from "@/types/requesterTask/requesterTaskTypes";

function formatDateTime(value?: string | null): string {
  if (!value) return "Pending";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

export default function TimelineTab({
  timeline,
}: {
  timeline: RequesterTaskTimelineEvent[];
}) {
  return (
    <div className="space-y-5 py-2">
      {timeline.map((event, index) => {
        const isPending = !event.createdAt;
        const Icon =
          index === 0
            ? Plus
            : isPending
              ? CheckCircle2
              : index === 1
                ? UserCheck
                : Clock;

        return (
          <div
            key={event.id ?? `${event.label || event.status}-${index}`}
            className={`flex items-start gap-4 ${isPending ? "opacity-50" : ""}`}
          >
            <div
              className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 ${
                isPending
                  ? "border-2 border-dashed border-[#9DA4AE]"
                  : "border-2 border-secondary"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isPending ? "text-[#9DA4AE]" : "text-secondary"
                }`}
              />
            </div>
            <div className="pt-1">
              <p
                className={`text-sm font-semibold ${
                  isPending ? "text-[#9DA4AE]" : "text-[#181d27]"
                }`}
              >
                {event.label || event.status || "Activity updated"}
              </p>
              <p className="text-xs text-[#9DA4AE] mt-0.5">
                {formatDateTime(event.createdAt)}
              </p>
              {event.description && (
                <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
