import { CheckCircle, Folders } from "lucide-react";

export function ProjectHistoryTab() {
  const events = [
    {
      date: "Feb 20, 2025",
      label: "Opportunity Indexed by Requester",
      icon: Folders,
    },
    {
      date: "Feb 21, 2025",
      label: "Fulfillment Proposal Submitted",
      icon: CheckCircle,
    },
  ];

  return (
    <div className="space-y-4 min-h-[60vh]">
      <div className="relative pl-12">
        {events.map((ev) => {
          const Icon = ev.icon;
          return (
            <div key={ev.label} className="relative flex gap-3 mb-5 last:mb-0">
              <div
                className={`  w-10 h-10 rounded-full flex justify-center p-2 bg-[#FFF6ED]`}
              >
                <Icon className="w-6 h-6 font-bold text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#181d27]">{ev.label}</p>
                <p className="text-xs ">{ev.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
