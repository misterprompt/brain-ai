import type { MoveRecord } from '../../types';

interface MoveHistoryProps {
  moves: MoveRecord[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  return (
    <div className="h-full">
      {moves.length === 0 ? (
        <div className="text-center text-muted text-sm italic py-4">
          No moves played yet.
        </div>
      ) : (
        <div className="space-y-1">
          {moves.map((move, index) => (
            <div
              key={index}
              className="flex items-center text-sm py-1 border-b border-white/5 last:border-0"
            >
              <span className="w-8 text-muted font-mono text-xs">{index + 1}.</span>
              <span className={`w-16 font-medium ${move.player === 'white' ? 'text-white' : 'text-gray-400'}`}>
                {move.player === 'white' ? 'White' : 'Black'}
              </span>
              <span className="flex-1 font-mono text-gold text-right">
                {move.notation}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
