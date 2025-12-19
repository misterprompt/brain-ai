import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '../api/client';

export type SocketMessage = {
  type: string;
  payload: any;
  timestamp?: string;
  senderId?: string | null;
};

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

// Client-side heartbeat configuration. The backend already uses WebSocket ping/pong,
// but we also track last activity on the client so we can react quickly in the UI.
const HEARTBEAT_CHECK_INTERVAL = 5_000; // how often we check for activity
const HEARTBEAT_TIMEOUT = 15_000; // if no activity for this long, we treat the socket as dead

export const useGameSocket = (
  gameId: string | number | null,
  onEvent: (message: SocketMessage) => void
) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastActivityRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Constants
  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_RECONNECT_DELAY = 1000;
  const MAX_RECONNECT_DELAY = 10000;

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const connect = useCallback(() => {
    if (!gameId || !isMountedRef.current) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token found, skipping WebSocket connection');
      return;
    }

    // Prevent multiple connections
    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setStatus(prev => prev === 'disconnected' ? 'connecting' : 'reconnecting');

    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const wsHost = API_BASE_URL.replace(/^https?:\/\//, '');
    const url = `${wsProtocol}://${wsHost}/ws/game?gameId=${gameId}`;

    console.log(`Connecting to WebSocket: ${url}`);
    const ws = new WebSocket(url, [`Bearer ${token}`]);

    ws.onopen = () => {
      if (!isMountedRef.current) {
        ws.close();
        return;
      }
      console.log('WebSocket connected');
      setStatus('connected');
      reconnectAttemptsRef.current = 0;

      // Start or reset heartbeat tracking on successful connection
      lastActivityRef.current = Date.now();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(() => {
        const last = lastActivityRef.current;
        if (!last) return;

        const now = Date.now();
        if (now - last > HEARTBEAT_TIMEOUT) {
          console.warn('WebSocket heartbeat timeout, closing socket');
          if (socketRef.current &&
              (socketRef.current.readyState === WebSocket.OPEN ||
               socketRef.current.readyState === WebSocket.CONNECTING)) {
            socketRef.current.close(4000, 'Heartbeat timeout');
          }
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
        }
      }, HEARTBEAT_CHECK_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SocketMessage;
        // Any successfully parsed message counts as activity from the server
        lastActivityRef.current = Date.now();
        onEventRef.current(message);
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    ws.onclose = (event) => {
      if (!isMountedRef.current) return;

      console.log(`WebSocket disconnected (Code: ${event.code}, Reason: ${event.reason})`);
      setStatus('disconnected');
      socketRef.current = null;

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Don't reconnect if closed cleanly or auth failed
      if (event.code === 1000 || event.code === 1008) {
        return;
      }

      // Attempt reconnection
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current),
          MAX_RECONNECT_DELAY
        );

        console.log(`Attempting reconnect in ${delay}ms (Attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error', error);
      // onerror is usually followed by onclose, so we handle reconnection there
    };

    socketRef.current = ws;
  }, [gameId]);

  useEffect(() => {
    if (gameId) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounting');
        socketRef.current = null;
      }
    };
  }, [gameId, connect]);

  return {
    isConnected: status === 'connected',
    status,
    reconnect: () => {
      reconnectAttemptsRef.current = 0;
      connect();
    }
  };
};
