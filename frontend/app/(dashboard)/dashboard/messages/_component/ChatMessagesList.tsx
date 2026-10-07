import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import { Check, CheckCheck, Clock, FileText, Download, Trash2, Play, Pause, ShieldAlert, RotateCcw, CheckCircle2, Zap } from "lucide-react";
import { useGetRecipientChatQuery, useDeleteMessageMutation } from "@/redux/features/api/message/MessageApi";
import { useAppSelector } from "@/redux/store/hooks";
import { isValidUrl } from "@/lib/utils";
import { getCookie } from "@/lib/cookie";

function CustomAudioPlayer({ src, isYou }: { src: string; isYou: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [animOffset, setAnimOffset] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  // Soundwave heights sequence (32 distinct bars)
  const baseHeights = [25, 60, 35, 80, 50, 95, 40, 70, 55, 90, 30, 65, 75, 45, 60, 90, 35, 70, 80, 100, 55, 40, 85, 70, 45, 80, 60, 35, 75, 50, 65, 40];

  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setAnimOffset((prev) => (prev + 0.15) % (Math.PI * 2));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Audio playback error:", err);
      });
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const curTime = audio.currentTime || 0;
    setCurrentTime(curTime);

    if (isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    } else if (curTime > duration) {
      setDuration(curTime);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    } else {
      // Chrome WebM duration fix for recorded voice notes
      const initialTime = audio.currentTime;
      audio.currentTime = 1e101;
      audio.ontimeupdate = () => {
        audio.ontimeupdate = null;
        audio.currentTime = initialTime;
        if (isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      };
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-3.5 p-3.5 rounded-2xl w-80 max-w-full my-1 transition-all shadow-sm ${isYou
          ? "bg-gradient-to-r from-orange-50 to-amber-50/80 border border-orange-200/90 hover:border-orange-300"
          : "bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 hover:border-gray-300"
        }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleTimeUpdate}
      />

      <button
        onClick={togglePlay}
        type="button"
        className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-[#FD751F] text-white hover:bg-[#e06416] hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
      >
        {isPlaying ? (
          <Pause size={20} fill="currentColor" />
        ) : (
          <Play size={20} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center min-w-0 gap-1.5 select-none">
        {/* Soundwave Bars Waveform Container */}
        <div
          className="relative w-full h-9 flex items-center cursor-pointer group"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const newTime = Math.max(0, Math.min(duration, (x / rect.width) * duration));
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }}
          title="Click to seek"
        >
          <div className="w-full h-full flex items-center gap-[3px]">
            {baseHeights.map((baseH, i) => {
              const barProgress = (i / baseHeights.length) * 100;
              const isFilled = barProgress <= progressPercent;

              // Compute dynamic oscillating height during playback
              let barHeight = baseH;
              if (isPlaying) {
                const wave = Math.sin(animOffset + i * 0.45) * 22;
                barHeight = Math.max(25, Math.min(100, baseH + wave));
              }

              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-100 ${isFilled
                      ? "bg-[#FD751F]"
                      : "bg-gray-300 group-hover:bg-gray-400"
                    }`}
                  style={{ height: `${barHeight}%`, minHeight: "6px" }}
                />
              );
            })}
          </div>
        </div>

        {/* Duration & Time Labels */}
        <div className="flex justify-between items-center text-[11px] font-semibold text-gray-500 tracking-wide px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span className="flex items-center gap-1.5">
            {isPlaying && (
              <span className="flex gap-0.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              </span>
            )}
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

const resolveDocumentUrl = (m: any): string => {
  // 1. If backend provided a signed URL (documentUrl or document starting with http/blob/data), use it
  if (m?.documentUrl && (m.documentUrl.startsWith("http") || m.documentUrl.startsWith("blob") || m.documentUrl.startsWith("data"))) {
    return m.documentUrl;
  }
  if (m?.document && (m.document.startsWith("http") || m.document.startsWith("blob") || m.document.startsWith("data"))) {
    return m.document;
  }

  // 2. Fallback to S3 storage host for plain relative keys (e.g. "messaging/...")
  const key = m?.documentKey || m?.document;
  if (!key) return "";

  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  const s3Base = process.env.NEXT_PUBLIC_S3_BASE_URL || "https://backlyst-storage-622711945657-eu-west-2-an.s3.eu-west-2.amazonaws.com";
  return `${s3Base}/${cleanKey}`;
};

interface ChatMessagesListProps {
  selectedThread: any;
  overrideStatus?: string | null;
}

export function ChatMessagesList({ selectedThread, overrideStatus }: ChatMessagesListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const [optimisticMessages, setOptimisticMessages] = useState<any[]>([]);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<Set<string>>(new Set());

  const recipientId = selectedThread?.participant?.id;
  const taskId = selectedThread?.originalTaskId !== undefined ? (selectedThread.originalTaskId || undefined) : (selectedThread?.task?.id || undefined);

  const { data, isLoading, refetch } = useGetRecipientChatQuery(
    { recipientId, taskId, limit: 50 },
    { skip: !recipientId, refetchOnMountOrArgChange: true }
  );

  const [deleteMessage] = useDeleteMessageMutation();
  const currentUser = useAppSelector((state: any) => state.auth.user);

  // Reset optimistic messages when thread changes
  useEffect(() => {
    setOptimisticMessages([]);
    setLocallyDeletedIds(new Set()); // Clear locally deleted IDs on thread switch
    prevMessagesLengthRef.current = 0; // Reset length tracker
  }, [selectedThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const dbMessages = data?.data?.data || [];

  const task = selectedThread?.task;
  const currentStatus = overrideStatus || task?.lifecycleStatus;

  const systemMilestones = useMemo(() => {
    return [];
  }, [task, currentStatus]);

  const allMessages = useMemo(() => {
    // Deduplicate: avoid showing a message twice if it's in both dbMessages and optimisticMessages
    const dbIds = new Set(dbMessages.map((m: any) => m.id).filter(Boolean));
    const uniqueOptimistic = optimisticMessages.filter(
      (m) => !m.id || !dbIds.has(m.id)
    );

    const merged = [...dbMessages, ...uniqueOptimistic].filter(
      (msg) => !locallyDeletedIds.has(msg.id)
    );

    const combined = [...merged, ...systemMilestones];

    return combined.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
  }, [dbMessages, optimisticMessages, locallyDeletedIds, systemMilestones]);

  useEffect(() => {
    if (allMessages.length > prevMessagesLengthRef.current || (allMessages.length > 0 && prevMessagesLengthRef.current === 0)) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = allMessages.length;
  }, [allMessages.length]);

  const confirmDelete = async () => {
    if (messageToDelete) {
      try {
        await deleteMessage(messageToDelete).unwrap();
        // Optimistically hide the message
        setLocallyDeletedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(messageToDelete);
          return newSet;
        });
        // Refetch to sync with server
        refetch();
      } catch (err) {
        console.error("Failed to delete message", err);
      } finally {
        setMessageToDelete(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white text-gray-500 p-6">
        Loading messages...
      </div>
    );
  }

  // To infer "seen" without API changes: 
  // If the recipient has sent any message AFTER this message, they must have seen it.
  let lastRecipientMessageTime = 0;
  allMessages.forEach((m) => {
    if (m.senderId === recipientId && m.createdAt) {
      const t = new Date(m.createdAt).getTime();
      if (t > lastRecipientMessageTime) {
        lastRecipientMessageTime = t;
      }
    }
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 bg-white relative">
        {allMessages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          allMessages.map((msg, index) => {
            if (msg.isSystemMilestone) {
              let icon = null;
              if (msg.iconType === "shield") {
                icon = <ShieldAlert size={14} className="text-[#344054]" />;
              } else if (msg.iconType === "zap") {
                icon = <Zap size={14} className="text-[#344054]" />;
              } else if (msg.iconType === "rotate") {
                icon = <RotateCcw size={14} className="text-[#344054]" />;
              } else if (msg.iconType === "checkCircle") {
                icon = <CheckCircle2 size={14} className="text-[#12B76A]" />;
              }

              const formattedTime = msg.createdAt
                ? new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase() +
                ", " +
                new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <div key={msg.id} className="flex flex-col items-center gap-1.5 w-full my-4">
                  {index > 0 && (
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      {formattedTime}
                    </span>
                  )}
                  <div className="border border-[#E4E7EC] bg-white text-[#475467] rounded-full px-5 py-2.5 flex items-center gap-2 shadow-sm text-xs font-semibold tracking-wide uppercase">
                    {icon}
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            // Determine if it's sent by you
            // Assuming msg.senderId represents the sender and recipientId is the other person
            const isYou = msg.senderId !== recipientId;
            const isRestricted = msg.registryStatus === "RESTRICTED" || msg.restricted;
            const isDeleted = msg.isDeleted || msg.deleted;

            let fileName = "Attachment";
            let fileExt = "FILE";
            let isImage = false;
            let isAudio = false;

            const docUrl = resolveDocumentUrl(msg);
            const rawDocPath = msg.documentUrl || msg.document || "";

            if (rawDocPath) {
              // Extract filename from URL/Key (remove path and timestamp-uuid prefix if present)
              const rawName = rawDocPath.split('?')[0].split('/').pop() || "";
              const decodedName = decodeURIComponent(rawName);
              fileName = decodedName.replace(/^\d+-[a-f0-9\-]{36}-/, '');

              const extMatch = fileName.match(/\.([a-z0-9]+)$/i);
              if (extMatch) {
                fileExt = extMatch[1].toUpperCase();
                isImage = /^(JPG|JPEG|PNG|GIF|WEBP|BMP)$/i.test(fileExt);
                isAudio = /^(WEBM|MP3|WAV|OGG|M4A|AAC|OPUS)$/i.test(fileExt);
              }

              if (!isAudio && /voice-message|audio/i.test(rawDocPath)) {
                isAudio = true;
              }
            }

            const msgTime = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
            const isSeen = isYou && !msg.isOptimistic && msgTime > 0 && msgTime <= lastRecipientMessageTime;

            const participantName = selectedThread?.participant?.name || "User";
            const initial = participantName.charAt(0).toUpperCase();
            const participantAvatar = selectedThread?.participant?.imageKey;

            const isEmojiOnly = Boolean(!docUrl && msg.text && /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\s)+$/.test(msg.text.trim()) && msg.text.trim().length <= 16);
            const isImageOnly = Boolean(docUrl && isImage && !msg.text);
            const isAudioOnly = Boolean(docUrl && isAudio && !msg.text);
            const isFrameless = isEmojiOnly || isImageOnly || isAudioOnly;

            return (
              <div
                key={msg.id || index}
                className={`flex gap-2 md:gap-3 group ${isYou ? "justify-end" : "justify-start"
                  }`}
              >
                {!isYou && (
                  <div className="relative w-10 md:w-12 h-10 md:h-12 shrink-0">
                    {isValidUrl(participantAvatar) ? (
                      <Image
                        src={participantAvatar}
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
                      style={{ display: isValidUrl(participantAvatar) ? 'none' : 'flex' }}
                    >
                      {initial}
                    </div>
                  </div>
                )}

                {isYou && !msg.isOptimistic && !isDeleted && msg.id && (
                  <button
                    onClick={() => setMessageToDelete(msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full self-center"
                    title="Delete message"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <div className="flex flex-col max-w-xs md:max-w-md">
                  <div
                    className={
                      isFrameless
                        ? "p-0 bg-transparent border-0 shadow-none"
                        : `px-4 py-3 ${isYou
                          ? "rounded-2xl rounded-br-sm"
                          : "rounded-2xl rounded-tl-sm"
                        } ${isRestricted
                          ? "bg-red-50 border border-red-100 text-red-600 italic"
                          : isDeleted
                            ? "bg-gray-100 border border-gray-200 text-gray-500 italic"
                            : isYou
                              ? "bg-accent text-gray-900 border border-orange-100"
                              : "bg-[#FFF2E5] text-gray-900"
                        }`
                    }
                  >
                    {isRestricted ? (
                      <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">This message is restricted.</p>
                    ) : isDeleted ? (
                      <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">This message was deleted.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {msg.text && (
                          <p className={
                            isEmojiOnly
                              ? "text-4xl md:text-5xl py-1 leading-none select-none"
                              : "text-xs md:text-sm leading-relaxed whitespace-pre-wrap"
                          }>
                            {msg.text}
                          </p>
                        )}

                        {docUrl && (
                          isImage ? (
                            <a href={docUrl} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={docUrl}
                                alt={fileName}
                                className="max-w-full max-h-64 object-cover rounded-2xl border border-gray-200/60 shadow-sm hover:opacity-95 transition-opacity"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </a>
                          ) : isAudio ? (
                            <CustomAudioPlayer src={docUrl} isYou={isYou} />
                          ) : (
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-2.5 bg-white/60 border border-gray-200/50 rounded-lg hover:bg-white transition-colors mt-1"
                            >
                              <div className="p-2 bg-secondary/10 rounded-md text-secondary shrink-0">
                                <FileText size={18} />
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="text-xs font-medium text-gray-900 truncate" title={fileName}>
                                  {fileName}
                                </p>
                                <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">
                                  {fileExt}
                                </p>
                              </div>
                              <Download size={16} className="text-gray-400 shrink-0 ml-1 hover:text-secondary" />
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center gap-1 mt-1 ${isYou ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] font-medium text-gray-500">
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                        : ""}
                    </span>
                    {isYou && (
                      <div className="flex items-center">
                        {msg.isOptimistic ? (
                          <Clock size={12} className="text-gray-400" />
                        ) : isSeen ? (
                          <CheckCheck size={14} className="text-[#6B46FF]" />
                        ) : (
                          <Check size={12} className="text-gray-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isYou && (
                  <div className="relative w-8 md:w-8 h-8 md:h-8 shrink-0">
                    {isValidUrl(currentUser?.imageKey) ? (
                      <Image
                        src={currentUser.imageKey}
                        alt={currentUser?.name || "You"}
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
                      className="fallback-initial flex items-center justify-center w-full h-full rounded-full bg-orange-100 text-secondary font-bold text-sm border border-orange-200"
                      style={{ display: isValidUrl(currentUser?.imageKey) ? 'none' : 'flex' }}
                    >
                      {(currentUser?.name || "Y").charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {messageToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Message</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this message? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMessageToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
