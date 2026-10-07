import { useState, useEffect } from "react";
import { ChatHeader } from "./ChatHeader";
import { ApprovalConsole } from "./ApprovalConsole";
import { ChatMessagesList } from "./ChatMessagesList";
import { MessageInputArea } from "./MessageInputArea";

interface ChatWindowProps {
  selectedThread: any;
  setShowSidebarOnMobile: (show: boolean) => void;
}

export function ChatWindow({
  selectedThread,
  setShowSidebarOnMobile,
}: ChatWindowProps) {
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);

  useEffect(() => {
    setOverrideStatus(null);
  }, [selectedThread]);

  if (!selectedThread) {
    return (
      <div className="flex-1 flex flex-col bg-white min-w-0 md:min-w-0">
        <div className="flex-1 flex items-center justify-center text-gray-500 px-4">
          Select a task to view conversation
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 md:min-w-0 relative">
      <ChatHeader
        selectedThread={selectedThread}
        setShowSidebarOnMobile={setShowSidebarOnMobile}
        overrideStatus={overrideStatus}
      />

      <ChatMessagesList
        selectedThread={selectedThread}
        overrideStatus={overrideStatus}
      />

      <div className="mt-auto">
        {/* <ApprovalConsole 
          selectedThread={selectedThread} 
          overrideStatus={overrideStatus}
          setOverrideStatus={setOverrideStatus}
        /> */}
        <MessageInputArea selectedThread={selectedThread} />
      </div>
    </div>
  );
}
