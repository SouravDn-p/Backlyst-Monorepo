import { Paperclip, Mic, X, Image as ImageIcon, Square, Smile, Loader2 } from "lucide-react";
import { IoMdSend } from "react-icons/io";
import { MdScheduleSend } from "react-icons/md";
import { useState, useRef, useEffect } from "react";
import { useSendMessageAndFileMutation } from "@/redux/features/api/message/MessageApi";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import { useUploadToS3DirectMutation } from "@/redux/features/api/upload/uploadApi";
import { toast } from "sonner";

interface MessageInputAreaProps {
  selectedThread: any;
  onOptimisticSend?: (message: any) => void;
}

export function MessageInputArea({ selectedThread, onOptimisticSend }: MessageInputAreaProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [sendMessageMutation, { isLoading }] = useSendMessageAndFileMutation();
  const [uploadToS3Direct, { isLoading: isUploading }] = useUploadToS3DirectMutation();
  const { sendSocketMessage } = useChatWebSocket();
  const isBusy = isLoading || isUploading;

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Waveform visualization states
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const volumesRef = useRef<number[]>([]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState<"smileys" | "gestures" | "hearts" | "symbols">("smileys");

  const emojiCategories = {
    smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "🫣", "🫡", "🤔", "🫣", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"],
    gestures: ["👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🤞", "✌️", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✍️", "💪", "🧠", "👀", "👤", "👥"],
    hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💯", "🔥", "💥", "💫", "💦", "💨", "⚡", "✨", "🎉", "🎊", "🎈", "🎁", "⭐", "🌟", "🏆"],
    symbols: ["💡", "📱", "💻", "🖥️", "📷", "📸", "🎥", "📞", "✉️", "📧", "📦", "📁", "📂", "📄", "📜", "📝", "📊", "📈", "📉", "📌", "📍", "📎", "🔒", "🔓", "🔑", "🗝️", "✅", "❌", "❓", "❗", "⚠️", "🚫", "🛑", "🚀"]
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const val = (dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / bufferLength);

    volumesRef.current.push(rms);
    if (volumesRef.current.length > 50) {
      volumesRef.current.shift();
    }

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = canvas.width / 50;

    volumesRef.current.forEach((vol, i) => {
      const height = Math.max(2, vol * canvas.height * 2.5); // Boost visual height
      const x = i * barWidth;
      const y = (canvas.height - height) / 2;

      canvasCtx.fillStyle = '#ef4444'; // Red-500
      canvasCtx.beginPath();
      canvasCtx.roundRect(x + 1, y, Math.max(1, barWidth - 2), height, 2);
      canvasCtx.fill();
    });

    animationRef.current = requestAnimationFrame(drawWaveform);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      // Attempt to use a higher bitrate if supported by the browser
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
        setSelectedFile(audioFile);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        // Stop visualizer
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(console.error);
        }
      };

      mediaRecorder.start(200); // Collect data in 200ms chunks to ensure frequent firing
      setIsRecording(true);

      // Setup Visualizer
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        analyser.fftSize = 256;
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        volumesRef.current = new Array(50).fill(0); // prefill with silence

        // Use timeout to ensure canvas is mounted before drawing
        setTimeout(drawWaveform, 50);
      } catch (e) {
        console.error("Audio visualizer error:", e);
      }
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check your browser permissions.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Request final data and add a slight delay to capture the very end of speech
      mediaRecorderRef.current.requestData();
      setTimeout(() => {
        if (mediaRecorderRef.current?.state !== "inactive") {
          mediaRecorderRef.current?.stop();
        }
        setIsRecording(false);
      }, 300);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !selectedFile) || !selectedThread) return;

    const recipientId = selectedThread.participant?.id;
    const taskId = selectedThread.originalTaskId !== undefined ? (selectedThread.originalTaskId || null) : (selectedThread.task?.id || null);
    const text = inputMessage;

    setInputMessage("");
    const fileToSend = selectedFile;
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";

    if (fileToSend) {
      // Step 1: Upload file to S3 via /upload-s3/direct with folder "messaging"
      let documentUrlPayload: string | undefined;
      try {
        const uploadResult = await uploadToS3Direct({
          file: fileToSend,
          folder: "messaging",
        }).unwrap();
        // Use full S3 URL from upload response (downloadUrl or url)
        documentUrlPayload = uploadResult.downloadUrl || uploadResult.url || uploadResult.key;
      } catch (err) {
        console.error("Failed to upload file to S3", err);
        toast.error("Failed to upload file. Please try again.");
        return;
      }

      // Show optimistic pending message after successful upload with full image preview URL
      if (onOptimisticSend) {
        onOptimisticSend({
          id: Date.now().toString(),
          text,
          fileName: fileToSend.name,
          document: documentUrlPayload,
          documentUrl: documentUrlPayload,
          senderId: "you",
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        });
      }

      // Step 2: Send via WebSocket using `document` field with full URL from upload response
      // Fallback to HTTP using `documentKey` field if socket is unavailable
      const sentViaWs = sendSocketMessage(recipientId, text, taskId, documentUrlPayload);

      if (!sentViaWs) {
        try {
          await sendMessageMutation({
            recipientId,
            taskId,
            text,
            documentKey: documentUrlPayload,
          }).unwrap();
        } catch (err) {
          console.error("Failed to send file message via HTTP", err);
          toast.error("Failed to send message. Please try again.");
        }
      }
    } else {
      // Show optimistic pending message for text-only messages
      if (onOptimisticSend) {
        onOptimisticSend({
          id: Date.now().toString(),
          text,
          senderId: "you",
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        });
      }

      // Text-only: WebSocket first, HTTP fallback (docs §6 & §7)
      const sentViaWs = sendSocketMessage(recipientId, text, taskId);

      if (!sentViaWs) {
        try {
          await sendMessageMutation({
            recipientId,
            taskId,
            text,
          }).unwrap();
        } catch (err) {
          console.error("Failed to send message via HTTP", err);
        }
      }
    }
  };

  return (
    <div className="p-3 md:p-4 bg-white">
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <Paperclip size={16} className="text-secondary" />
          <span className="text-sm text-gray-700 truncate max-w-xs">{selectedFile.name}</span>
          <button
            onClick={() => setSelectedFile(null)}
            className="text-gray-400 hover:text-red-500 ml-auto"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className={`flex items-center gap-2 md:gap-3 bg-gray-50 rounded-full px-4 md:px-6 py-3.5 border border-gray-200 focus-within:border-[#fd751f] focus-within:ring-1 focus-within:ring-[#fd751f] transition-all ${isRecording ? 'ring-1 ring-red-500 border-red-500 bg-red-50' : ''}`}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors hidden md:block"
        >
          <Paperclip size={20} />
        </button>

        {isRecording ? (
          <div className="flex-1 min-w-0 flex items-center justify-center bg-red-50/50 rounded-md overflow-hidden relative cursor-pointer" onClick={toggleRecording} title="Click to stop recording">
            <canvas
              ref={canvasRef}
              width={200}
              height={30}
              className="w-full h-8"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-red-500/10 transition-opacity">
              <span className="text-xs font-semibold text-red-600 bg-white/80 px-2 py-0.5 rounded shadow-sm">Click to stop</span>
            </div>
          </div>
        ) : (
          <input
            type="text"
            placeholder="Write Something ..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 bg-transparent outline-none text-xs md:text-sm placeholder-gray-400 text-gray-700 min-w-0"
            disabled={isLoading}
          />
        )}

        <div className="flex items-center gap-2 md:gap-3 text-gray-400 shrink-0 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`transition-colors shrink-0 ${showEmojiPicker ? "text-secondary font-bold" : "text-gray-400 hover:text-gray-600"}`}
              title="Add emoji"
            >
              <Smile size={20} />
            </button>

            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-11 right-0 z-50 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Category Tabs */}
                <div className="flex border-b border-gray-100 pb-2.5 mb-2 justify-between text-base font-semibold text-gray-500">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("smileys")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeCategory === "smileys" ? "bg-orange-100 text-secondary scale-110" : "hover:bg-gray-100 opacity-70"}`}
                  >
                    😀
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("gestures")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeCategory === "gestures" ? "bg-orange-100 text-secondary scale-110" : "hover:bg-gray-100 opacity-70"}`}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("hearts")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeCategory === "hearts" ? "bg-orange-100 text-secondary scale-110" : "hover:bg-gray-100 opacity-70"}`}
                  >
                    ❤️
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("symbols")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeCategory === "symbols" ? "bg-orange-100 text-secondary scale-110" : "hover:bg-gray-100 opacity-70"}`}
                  >
                    💡
                  </button>
                </div>

                {/* Emoji Grid */}
                <div className="grid grid-cols-6 gap-1.5 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                  {emojiCategories[activeCategory].map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputMessage((prev) => prev + emoji);
                      }}
                      className="h-10 w-10 text-2xl flex items-center justify-center rounded-xl hover:bg-orange-100 hover:scale-130 transition-all select-none active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => imageInputRef.current?.click()}
            className="text-gray-400 hover:text-gray-600 transition-colors hidden md:block"
          >
            <ImageIcon size={20} />
          </button>

          <button
            onClick={toggleRecording}
            className={`text-gray-400 hover:text-gray-600 transition-colors hidden md:block ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
          >
            {isRecording ? <Square size={20} /> : <Mic size={20} />}
          </button>
        </div>

        <button
          onClick={handleSendMessage}
          disabled={isBusy || (!inputMessage.trim() && !selectedFile)}
          className="ml-2 hover:opacity-80 shrink-0 transition-opacity disabled:opacity-50 flex items-center justify-center"
          aria-label="Send message"
        >
          {isUploading ? (
            <Loader2 size={22} color="#FD751F" className="animate-spin" />
          ) : isBusy ? (
            <MdScheduleSend size={24} color="#FD751F" className="animate-pulse" />
          ) : (
            <IoMdSend size={24} color="#FD751F" />
          )}
        </button>
      </div>
    </div>
  );
}
