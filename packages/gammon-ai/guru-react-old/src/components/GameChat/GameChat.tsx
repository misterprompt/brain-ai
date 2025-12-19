import { type FC, useState, useMemo } from 'react';
import { useGameChat } from '../../hooks/useGameChat';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface GameChatProps {
  roomId: string | number | null;
  userId?: string | null;
}

export const GameChat: FC<GameChatProps> = ({ roomId, userId }) => {
  const [input, setInput] = useState('');

  const effectiveUserId = useMemo(() => {
    if (userId && userId.trim().length > 0) return userId.trim();
    return 'You';
  }, [userId]);

  const { messages, isConnected, error, sendMessage } = useGameChat({ roomId, userId });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-black/20">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted text-sm italic py-4">
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.isOwn
              ? 'bg-wood-light text-black'
              : 'bg-white/10 text-white'
              }`}>
              {msg.message}
            </div>
            <span className="text-[10px] text-muted mt-1 px-1">
              {msg.isOwn ? effectiveUserId : msg.userId || 'Opponent'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-white/10 bg-black/40">
        <form className="flex gap-2" onSubmit={handleSubmit}>
          <Input
            className="flex-1 text-sm py-1.5"
            placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!isConnected}
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={!isConnected || !input.trim()}
            className="px-3"
          >
            Send
          </Button>
        </form>
        {error && <div className="text-red-400 text-xs mt-2 text-center">{error}</div>}
      </div>
    </div>
  );
};
