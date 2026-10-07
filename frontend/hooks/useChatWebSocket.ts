import { useEffect, useState, useCallback } from 'react';
import { getCookie } from '@/lib/cookie';
import { toast } from 'sonner';

export type SocketEvent = {
  event: string;
  data: any;
};

// Singleton WebSocket states
let sharedSocket: WebSocket | null = null;
let isConnectedShared = false;
let reconnectTimeout: NodeJS.Timeout | null = null;
let currentToken: string | null = null;
let connectionCount = 0;
let disconnectTimeout: NodeJS.Timeout | null = null;

const listeners = new Set<(event: SocketEvent) => void>();

const notifyListeners = (event: SocketEvent) => {
  listeners.forEach((listener) => listener(event));
};

const disconnect = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (sharedSocket) {
    sharedSocket.onclose = null;
    sharedSocket.onmessage = null;
    sharedSocket.onerror = null;
    sharedSocket.onopen = null;
    sharedSocket.close();
    sharedSocket = null;
  }
  isConnectedShared = false;
  currentToken = null;
  notifyListeners({ event: "connection_status", data: { isConnected: false } });
};

const connect = (token: string) => {
  if (sharedSocket && currentToken === token) {
    return; // Already connecting/connected with this token
  }

  if (sharedSocket) {
    disconnect();
  }

  currentToken = token;

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://backlystapi.softvenceomegaforce.cloud";
  let wsBaseUrl = "";

  if (apiBaseUrl.startsWith("https://")) {
    wsBaseUrl = apiBaseUrl.replace(/^https:\/\//i, "wss://");
  } else if (apiBaseUrl.startsWith("http://")) {
    wsBaseUrl = apiBaseUrl.replace(/^http:\/\//i, "ws://");
  } else {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // If apiBaseUrl is empty, use the window's protocol and host, otherwise resolve relatively
      if (!apiBaseUrl) {
        wsBaseUrl = `${protocol}//${window.location.host}`;
      } else {
        wsBaseUrl = `${protocol}//${window.location.host}${apiBaseUrl.startsWith("/") ? "" : "/"}${apiBaseUrl}`;
      }
    }
  }

  const wsUrl = `${wsBaseUrl}/?token=${token}`;

  try {
    const ws = new WebSocket(wsUrl);
    sharedSocket = ws;

    ws.onopen = () => {
      console.log("Chat WebSocket connected");
      isConnectedShared = true;
      notifyListeners({ event: "connection_status", data: { isConnected: true } });
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        notifyListeners(payload);

        if (payload.event === "message:error") {
          toast.error(payload.data?.message || "Failed to send message");
        }
      } catch (err) {
        console.log("Failed to parse websocket message", err);
      }
    };

    ws.onclose = (event) => {
      console.log("Chat WebSocket disconnected", event.code, event.reason);
      isConnectedShared = false;
      sharedSocket = null;
      notifyListeners({ event: "connection_status", data: { isConnected: false } });

      // Docs close codes:
      // 4000 → session disconnected (logout). Stop reconnecting.
      // 4001 → missing/invalid/expired token. Notify app to refresh token or force login.
      if (event.code === 4000) {
        console.log("Chat WebSocket: session closed, not reconnecting.");
        notifyListeners({ event: "auth_error", data: { code: 4000, message: "Session closed" } });
        return;
      }

      if (event.code === 4001) {
        console.log("Chat WebSocket: token invalid/expired, notifying app.");
        notifyListeners({ event: "auth_error", data: { code: 4001, message: "Token invalid or expired" } });
        return;
      }

      // Normal network close — reconnect after 3s
      reconnectTimeout = setTimeout(() => connect(token), 3000);
    };

    ws.onerror = () => {
      console.log("Chat WebSocket error occurred");
    };
  } catch (err) {
    console.error("Failed to establish WebSocket connection", err);
    sharedSocket = null;
    reconnectTimeout = setTimeout(() => connect(token), 3000);
  }
};

export const useChatWebSocket = () => {
  const [isConnected, setIsConnected] = useState(isConnectedShared);
  const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);

  useEffect(() => {
    const token = getCookie("accessToken");
    if (!token) return;

    if (disconnectTimeout) {
      clearTimeout(disconnectTimeout);
      disconnectTimeout = null;
    }

    connect(token);
    setIsConnected(isConnectedShared);

    const listener = (event: SocketEvent) => {
      if (event.event === "connection_status") {
        setIsConnected(event.data.isConnected);
      } else {
        setLastEvent(event);
      }
    };

    listeners.add(listener);
    connectionCount++;

    return () => {
      listeners.delete(listener);
      connectionCount--;

      if (connectionCount === 0) {
        disconnectTimeout = setTimeout(() => {
          if (connectionCount === 0) {
            disconnect();
          }
        }, 1000);
      }
    };
  }, []);

  const sendSocketMessage = useCallback((recipientId: string, text: string, taskId?: string, document?: string) => {
    if (sharedSocket?.readyState === WebSocket.OPEN) {
      sharedSocket.send(
        JSON.stringify({
          event: "message",
          data: {
            recipientId,
            text,
            ...(taskId && { taskId }),
            ...(document && { document }),
          },
        })
      );
      return true;
    }
    return false;
  }, []);

  return { isConnected, lastEvent, sendSocketMessage };
};