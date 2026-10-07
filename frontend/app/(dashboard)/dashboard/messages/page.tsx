"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatSidebar } from "./_component/ChatSidebar";
import { ChatWindow } from "./_component/ChatWindow";
import { useGetRequesterTaskQuery } from "@/redux/features/api/requesterTask/requesterTaskApi";
import { useGetProviderTaskDetailQuery } from "@/redux/features/api/providerTask/providerTaskApi";
import { useGetUserMessagesQuery, messageApi } from "@/redux/features/api/message/MessageApi";
import { useAppSelector, useAppDispatch } from "@/redux/store/hooks";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";

function ActiveTasksPageContent() {
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(false);
  const [paramsProcessed, setParamsProcessed] = useState(false);

  const searchParams = useSearchParams();
  const recipientId = searchParams.get("recipientId");
  const taskId = searchParams.get("taskId");
  const recipientName = searchParams.get("recipientName");
  const recipientAvatar = searchParams.get("recipientAvatar");

  const currentUser = useAppSelector((state: any) => state.auth.user);
  const isProvider = currentUser?.role === "PROVIDER";
  const dispatch = useAppDispatch();
  const { lastEvent } = useChatWebSocket();

  // Load user threads
  const { data: threadsData, isLoading: isLoadingThreads } = useGetUserMessagesQuery({
    page: 1,
    limit: 50,
  });

  // Load task details as requester
  const { data: requesterTaskData, isLoading: isLoadingRequesterTask } = useGetRequesterTaskQuery(taskId || "", {
    skip: !taskId || isProvider,
  });

  // Load task details as provider
  const { data: providerTaskData, isLoading: isLoadingProviderTask } = useGetProviderTaskDetailQuery(taskId || "", {
    skip: !taskId || !isProvider,
  });

  const taskData = isProvider ? providerTaskData : requesterTaskData;
  const isLoadingTask = isProvider ? isLoadingProviderTask : isLoadingRequesterTask;

  useEffect(() => {
    if (isLoadingThreads || (taskId && isLoadingTask) || paramsProcessed) return;

    const threads = threadsData?.data?.items || [];

    // Check if we already have a thread for this participant and task
    if (recipientId) {
      let matchedThread = threads.find(
        (thread: any) =>
          thread.participant?.id === recipientId && thread.task?.id === taskId
      );

      // Fallback: Try finding any existing thread with this recipientId (e.g. direct chat)
      if (!matchedThread) {
        matchedThread = threads.find(
          (thread: any) => thread.participant?.id === recipientId
        );
      }

      if (matchedThread) {
        let updatedThread = { ...matchedThread };
        updatedThread.originalTaskId = matchedThread.task?.id || null;
        if (taskId && (!updatedThread.task || updatedThread.task.id !== taskId)) {
          const taskObj = taskData?.data as any;
          updatedThread.task = {
            id: taskId,
            projectTitle: taskObj?.projectTitle || "",
            domain: taskObj?.domain || (taskObj?.targetUrl ? getHostname(taskObj.targetUrl) : ""),
            requiredDomainRating: taskObj?.requiredDomainRating,
            lifecycleStatus: taskObj?.lifecycleStatus || "OPEN"
          };
        }
        setSelectedThread(updatedThread);
        setParamsProcessed(true);
      } else {
        // Construct a new temporary thread since there's no chat history yet
        let name = recipientName ? decodeURIComponent(recipientName) : "User";
        let avatar = recipientAvatar ? decodeURIComponent(recipientAvatar) : null;
        let role = "USER";
        let taskTitle = "";
        let taskDomain = "";
        let lifecycleStatus = "OPEN";

        if (taskData?.data) {
          const task = taskData.data as any;
          const provider = task.provider || task.selectedProvider;
          const requester = task.requester;

          let targetParticipant = null;
          if (provider && provider.id === recipientId) {
            targetParticipant = provider;
          } else if (requester && requester.id === recipientId) {
            targetParticipant = requester;
          }

          if (targetParticipant) {
            name = targetParticipant.name || name;
            avatar = targetParticipant.imageUrl || targetParticipant.imageKey || avatar;
            role = targetParticipant.id === provider?.id ? "PROVIDER" : "REQUESTER";
          }
          taskTitle = task.projectTitle || "";
          taskDomain = task.targetUrl ? getHostname(task.targetUrl) : "";
          lifecycleStatus = task.lifecycleStatus || "OPEN";
        }

        const tempThread = {
          participant: {
            id: recipientId,
            name,
            imageKey: avatar,
            role,
          },
          task: taskId ? {
            id: taskId,
            title: taskTitle,
            projectTitle: taskTitle,
            domain: taskDomain,
            lifecycleStatus,
          } : null,
          unreadCount: 0,
          lastMessage: null,
          lastMessageAt: null,
          isTemp: true, // Mark it as temporary
        };
        setSelectedThread(tempThread);
        setParamsProcessed(true);
      }
    } else if (threads.length > 0) {
      // Default to first thread if no specific query parameters are passed
      setSelectedThread(threads[0]);
      setParamsProcessed(true);
    }
  }, [recipientId, taskId, recipientName, recipientAvatar, threadsData, taskData, isLoadingThreads, isLoadingTask, paramsProcessed]);

  const getHostname = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return urlStr || "";
    }
  };

  // Listen to WebSocket events to update messages & sidebar lists
  useEffect(() => {
    if (!lastEvent || !currentUser?.id) return;

    if (lastEvent.event === "message") {
      const message = lastEvent.data;
      const currentUserId = currentUser.id;
      if (!message) return;

      const participantId = message.senderId === currentUserId ? message.recipientId : message.senderId;
      const msgTaskId = message.taskId || null;

      // 1. Update the chat list (getUserMessages query)
      dispatch(
        messageApi.util.updateQueryData("getUserMessages", { page: 1, limit: 50 }, (draft) => {
          if (!draft || !draft.data || !draft.data.items) return;
          const items = draft.data.items;

          const threadIndex = items.findIndex((t: any) => {
            const tTaskId = t.task?.id || null;
            return t.participant?.id === participantId && tTaskId === msgTaskId;
          });

          if (threadIndex !== -1) {
            const thread = items[threadIndex];
            thread.lastMessage = message;
            thread.lastMessageAt = message.createdAt;

            const isFromOther = message.senderId !== currentUserId;
            const isActiveThread = selectedThread &&
              selectedThread.participant?.id === participantId &&
              (selectedThread.task?.id || null) === msgTaskId;

            if (isFromOther && !isActiveThread) {
              thread.unreadCount = (thread.unreadCount || 0) + 1;
            }

            items.splice(threadIndex, 1);
            items.unshift(thread);
          } else {
            dispatch(
              messageApi.endpoints.getUserMessages.initiate(
                { page: 1, limit: 50 },
                { subscribe: false, forceRefetch: true }
              )
            );
          }
        })
      );

      // 2. Update the active chat messages (getRecipientChat query)
      dispatch(
        messageApi.util.updateQueryData(
          "getRecipientChat",
          { recipientId: participantId, taskId: msgTaskId || undefined, limit: 50 },
          (draft) => {
            if (!draft || !draft.data) return;
            if (!draft.data.data) {
              draft.data.data = [];
            }
            const exists = draft.data.data.some((m: any) => m.id === message.id);
            if (!exists) {
              draft.data.data.push(message);
            } else {
              const idx = draft.data.data.findIndex((m: any) => m.id === message.id);
              if (idx !== -1) {
                draft.data.data[idx] = message;
              }
            }
          }
        )
      );
    } else if (lastEvent.event === "message:deleted") {
      const { messageId, taskId: msgTaskId } = lastEvent.data || {};
      if (!messageId) return;

      if (selectedThread?.participant?.id) {
        dispatch(
          messageApi.util.updateQueryData(
            "getRecipientChat",
            { recipientId: selectedThread.participant.id, taskId: msgTaskId || undefined, limit: 50 },
            (draft) => {
              if (!draft?.data?.data) return;
              const msg = draft.data.data.find((m: any) => m.id === messageId);
              if (msg) {
                msg.isDeleted = true;
                msg.text = null;
                msg.document = null;
                msg.documentUrl = null;
              }
            }
          )
        );
      }
    } else if (lastEvent.event === "message:registry_updated") {
      const { messageId, registryStatus, taskId: msgTaskId } = lastEvent.data || {};
      if (!messageId) return;

      if (selectedThread?.participant?.id) {
        dispatch(
          messageApi.util.updateQueryData(
            "getRecipientChat",
            { recipientId: selectedThread.participant.id, taskId: msgTaskId || undefined, limit: 50 },
            (draft) => {
              if (!draft?.data?.data) return;
              const msg = draft.data.data.find((m: any) => m.id === messageId);
              if (msg) {
                msg.registryStatus = registryStatus;
              }
            }
          )
        );
      }
    }
  }, [lastEvent, currentUser, selectedThread, dispatch]);

  return (
    <div className="flex h-[90vh] md:h-[85vh] bg-gray-50 font-sans overflow-hidden rounded-2xl relative w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0 shadow-lg">
      {/* Mobile Sidebar Overlay */}
      {showSidebarOnMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowSidebarOnMobile(false)}
        />
      )}

      {/* LEFT – Active Tasks List */}
      <ChatSidebar
        showSidebarOnMobile={showSidebarOnMobile}
        setShowSidebarOnMobile={setShowSidebarOnMobile}
        selectedThread={selectedThread}
        onSelectThread={setSelectedThread}
      />

      {/* RIGHT – Chat Area */}
      <ChatWindow
        selectedThread={selectedThread}
        setShowSidebarOnMobile={setShowSidebarOnMobile}
      />
    </div>
  );
}

export default function ActiveTasksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[90vh] md:h-[85vh] bg-gray-50 rounded-2xl w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0 shadow-lg">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    }>
      <ActiveTasksPageContent />
    </Suspense>
  );
}