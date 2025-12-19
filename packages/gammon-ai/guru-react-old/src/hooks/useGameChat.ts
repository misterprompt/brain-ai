import { useCallback, useEffect, useRef, useState } from 'react';

export type ChatMessage = {
  id: string;
  userId: string;
  message: string;
  timestamp: string;
  isOwn: boolean;
};

export type UseGameChatOptions = {
  roomId: string | number | null;
  userId?: string | null;
  baseWsUrl?: string;
  floodIntervalMs?: number;
  maxMessageLength?: number;
};

export type UseGameChatResult = {
  messages: ChatMessage[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
};

function buildWebSocketUrl(path: string, baseOverride?: string): string {
  if (baseOverride) {
    return `${baseOverride.replace(/\/$/, '')}${path}`;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}${path}`;
}

function sanitizeMessage(message: string, maxLength: number): string {
  let trimmed = message.trim();
  if (!trimmed) return '';

  if (trimmed.length > maxLength) {
    trimmed = trimmed.slice(0, maxLength);
  }

  const banned = ['fuck', 'shit', 'merde'];
  let sanitized = trimmed;

  for (const word of banned) {
    const re = new RegExp(word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    sanitized = sanitized.replace(re, '***');
  }

  return sanitized;
}

export function useGameChat(options: UseGameChatOptions): UseGameChatResult {
  const { roomId, userId, baseWsUrl, floodIntervalMs = 800, maxMessageLength = 300 } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const path = `/ws/chat/${encodeURIComponent(String(roomId))}`;
    const url = buildWebSocketUrl(path, baseWsUrl);

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    socket.onerror = (event) => {
      console.error('GameChat WebSocket error', event);
      setError('Erreur de connexion au chat.');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type: string;
          payload?: { roomId?: string; message?: string; userId?: string };
          timestamp?: string;
          senderId?: string | null;
        };

        if (data.type !== 'CHAT_MESSAGE' || !data.payload) {
          return;
        }

        const payload = data.payload;
        const incomingText = payload.message ?? '';
        if (!incomingText) return;
        if (payload.roomId && payload.roomId !== String(roomId)) return;

        const effectiveUserId = (userId ?? '').trim() || 'anonymous';
        const fromId = payload.userId ?? 'unknown';
        const isOwn = fromId === effectiveUserId;

        const ts = data.timestamp ?? new Date().toISOString();

        setMessages((prev) => [
          ...prev,
          {
            id: `${ts}-${prev.length}`,
            userId: fromId,
            message: incomingText,
            timestamp: ts,
            isOwn
          }
        ]);
      } catch (err) {
        console.error('Failed to parse chat message', err);
      }
    };

    return () => {
      socketRef.current = null;
      try {
        socket.close();
      } catch {
        // ignore
      }
    };
  }, [roomId, baseWsUrl, userId]);

  const sendMessage = useCallback(
    (rawText: string) => {
      const socket = socketRef.current;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setError('Chat non connecté.');
        return;
      }

      if (now - lastSentRef.current < floodIntervalMs) {
        setError('Vous envoyez les messages trop rapidement.');
        return;
      }

      const sanitized = sanitizeMessage(rawText, maxMessageLength);
      if (!sanitized) {
        return;
      }

      const effectiveUserId = (userId ?? '').trim() || 'anonymous';

      const payload = {
        roomId: String(roomId),
        message: sanitized,
        userId: effectiveUserId
      };

      try {
        const outgoing = {
          type: 'CHAT_MESSAGE',
          payload
        };
        socket.send(JSON.stringify(outgoing));

        const ts = new Date().toISOString();
        lastSentRef.current = now;

        setMessages((prev) => [
          ...prev,
          {
            id: `${ts}-self-${prev.length}`,
            userId: effectiveUserId,
            message: sanitized,
            timestamp: ts,
            isOwn: true
          }
        ]);
        setError(null);
      } catch (err) {
        console.error('Failed to send chat message', err);
        setError('Impossible d\'envoyer le message.');
      }
    },
    [roomId, userId, floodIntervalMs, maxMessageLength]
  );

  const isConnecting = !isConnected && !error;

  return {
    messages,
    isConnected,
    isConnecting,
    error,
    sendMessage
  };
}
