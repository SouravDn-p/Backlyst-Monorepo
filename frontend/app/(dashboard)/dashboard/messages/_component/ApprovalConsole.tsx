import { ShieldAlert, RotateCcw, CheckCircle2 } from "lucide-react";

interface ApprovalConsoleProps {
  selectedThread: any;
  overrideStatus: string | null;
  setOverrideStatus: (status: string | null) => void;
}

export function ApprovalConsole({ 
  selectedThread,
  overrideStatus,
  setOverrideStatus
}: ApprovalConsoleProps) {
  const task = selectedThread?.task;
  const currentStatus = overrideStatus || task?.lifecycleStatus;

  if (!task) return null;

  // Hide the console once approved/completed
  if (currentStatus === "APPROVED" || currentStatus === "COMPLETED") return null;

  return (
    <div className="mx-4 md:mx-6 my-2 bg-[#FFF9F6] border border-[#FFE7DB] rounded-2xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="text-[#FD751F] shrink-0" size={18} />
        <span className="font-bold text-[#FF8540] uppercase text-[10px] tracking-wider">
          Requester Approval Console
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setOverrideStatus("REVISION_REQUESTED")}
          className="bg-white border border-[#E4E7EC] hover:bg-gray-50 text-[#344054] font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
        >
          <RotateCcw size={16} className="text-[#344054]" />
          REQUEST REVISION
        </button>
        <button 
          onClick={() => setOverrideStatus("APPROVED")}
          className="bg-[#FD751F] hover:bg-[#e05e10] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
        >
          <CheckCircle2 size={16} className="text-white" />
          APPROVE & RELEASE ESCROW
        </button>
      </div>
    </div>
  );
}
