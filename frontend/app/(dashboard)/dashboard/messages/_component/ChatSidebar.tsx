import { Search, X } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useGetUserMessagesQuery } from "@/redux/features/api/message/MessageApi";
import { useAppSelector } from "@/redux/store/hooks";
import { isValidUrl } from "@/lib/utils";

interface ChatSidebarProps {
  showSidebarOnMobile: boolean;
  setShowSidebarOnMobile: (show: boolean) => void;
  selectedThread: any | null;
  onSelectThread: (thread: any) => void;
}

export function ChatSidebar({
  showSidebarOnMobile,
  setShowSidebarOnMobile,
  selectedThread,
  onSelectThread,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading, refetch } = useGetUserMessagesQuery({
    page: 1,
    limit: 50,
    search: searchQuery || undefined,
  });

  const currentUser = useAppSelector((state: any) => state.auth.user);
  let threads = [...(data?.data?.items || [])];

  // If there's a temporary selected thread, append it to the threads list so it displays as selected
  if (selectedThread && selectedThread.isTemp) {
    const exists = threads.some(
      (t: any) =>
        t.participant?.id === selectedThread.participant?.id &&
        t.task?.id === selectedThread.task?.id
    );
    if (!exists) {
      threads.unshift(selectedThread);
    }
  }



  const filteredThreads = threads.filter((thread: any) => {
    // Filter by unread
    if (filter === "unread" && thread.unreadCount === 0) return false;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const participantName = thread.participant?.name?.toLowerCase() || "";
      const taskTitle = thread.task?.title?.toLowerCase() || "";
      const domain = thread.task?.domain?.toLowerCase() || "";

      if (!participantName.includes(q) && !taskTitle.includes(q) && !domain.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div
      className={`absolute md:relative z-50 md:z-auto inset-y-0 left-0 w-full md:w-72 xl:w-96 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 md:transition-none ${showSidebarOnMobile
        ? "translate-x-0"
        : "-translate-x-full md:translate-x-0"
        }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Active Tasks</h1>
        <button
          onClick={() => setShowSidebarOnMobile(false)}
          className="md:hidden text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search tasks or partners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-1 cursor-pointer text-sm font-medium rounded-full transition-colors ${filter === "all"
            ? "bg-secondary text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-2 py-1 cursor-pointer text-sm font-medium rounded-full transition-colors ${filter === "unread"
            ? "bg-secondary text-white"
            : "bg-accent text-secondary hover:bg-gray-200"
            }`}
        >
          Unread
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Loading...
          </div>
        ) : filteredThreads.length > 0 ? (
          filteredThreads.map((thread: any) => {
            const isSelected =
              selectedThread?.participant?.id === thread.participant?.id &&
              (selectedThread?.task?.id === thread.task?.id ||
               selectedThread?.originalTaskId === thread.task?.id ||
               (!thread.task?.id && selectedThread?.task?.id));
            const avatarUrl = thread.participant?.imageKey;
            const participantName = thread.participant?.name || "User";
            const initial = participantName.charAt(0).toUpperCase();

            return (
              <div
                key={`${thread.participant.id}-${thread.task?.id || "direct"}`}
                onClick={() => {
                  onSelectThread(thread);
                  setShowSidebarOnMobile(false);
                }}
                className={`p-3 md:p-4 cursor-pointer transition-colors  ${thread.unreadCount > 0
                  ? "bg-[#FFF1E9]" // pending message background
                  : "bg-white hover:bg-gray-50"
                  } ${isSelected ? "bg-gray-100!" : ""}`}
              >
                <div className="flex items-start gap-3 relative">
                  <div className="relative w-12 h-12 shrink-0">
                    {isValidUrl(avatarUrl) ? (
                      <Image
                        src={avatarUrl}
                        alt={participantName}
                        fill
                        className="object-cover rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-initial') as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="fallback-initial flex items-center justify-center w-full h-full rounded-full bg-accent text-secondary font-bold text-lg border border-orange-100"
                      style={{ display: isValidUrl(avatarUrl) ? 'none' : 'flex' }}
                    >
                      {initial}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 bg-[#10b981] border-2 border-white rounded-full ${thread.unreadCount > 0 ? 'border-[#FFF1E9]' : ''}`}></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-[#181d27] text-[15px] truncate">
                        {participantName}
                      </h3>
                      <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">
                        {thread.lastMessageAt
                          ? new Date(thread.lastMessageAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : ""}
                      </span>
                    </div>

                    <p className="text-[13px] text-gray-500 mt-0.5 truncate font-medium">
                      {thread.lastMessage?.text || (thread.lastMessage?.document ? "Sent a file" : "No messages yet")}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wide truncate max-w-[150px] bg-transparent ${thread.unreadCount > 0
                        ? "border-secondary text-secondary"
                        : "border-[#10b981] text-[#10b981]"
                        }`}>
                        {isSelected && selectedThread?.task
                          ? (selectedThread.task.domain || selectedThread.task.projectTitle || "Direct Chat")
                          : (thread.task?.domain || thread.task?.projectTitle || "Direct Chat")}
                      </span>

                      {thread.unreadCount > 0 && (
                        <span className="bg-secondary text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500">
            No tasks found
          </div>
        )}
      </div>
    </div>
  );
}
