import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (url: string) => {
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const wsUrl = `${url}?token=${token}`;

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket Connected');
            setIsConnected(true);
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLastMessage(data);
            } catch (e) {
                console.error('WebSocket message parse error', e);
            }
        };

        ws.current.onclose = () => {
            console.log('WebSocket Disconnected');
            setIsConnected(false);
        };

        return () => {
            ws.current?.close();
        };
    }, [url]);

    const sendMessage = (msg: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(msg));
        }
    };

    return { isConnected, lastMessage, sendMessage };
};
