import React from 'react';
import { useParams } from 'react-router-dom';
import { GameBoard } from '../components/GameBoard/GameBoard';
import { useBackgammon } from '../hooks/useBackgammon';
import { MoveHistory } from '../components/MoveHistory/MoveHistory';
import { GameChat } from '../components/GameChat/GameChat';
import { Button } from '../components/ui/Button';

export const GamePage: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const isLocal = gameId === 'local';

    const { gameState, handlePointClick, requestHint, connectionStatus, offerDouble, respondToDouble } = useBackgammon({ gameId: isLocal ? null : gameId });

    return (
        <div className="game-page-container h-full flex flex-col min-h-[calc(100vh-64px)]">
            {/* Game Header */}
            <div className="bg-black/20 border-b border-white/5 py-2 px-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <span className="text-muted font-mono text-sm">
                        {isLocal ? 'LOCAL MATCH' : `MATCH #${gameId?.slice(0, 8)}`}
                    </span>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {connectionStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
                    </div>
                </div>

                {/* Game Status / Cube Controls */}
                <div className="flex items-center gap-4">
                    <div className="text-xl font-bold text-glow-gold">
                        {gameState.currentPlayer === 'white' ? "White's Turn" : "Black's Turn"}
                    </div>

                    {/* Cube Offer UI */}
                    {gameState.doublePending && (
                        <div className="flex items-center gap-2 animate-pulse">
                            <span className="text-yellow-400 font-bold">Double Offered!</span>
                            <Button size="sm" variant="primary" onClick={() => respondToDouble?.(true)}>
                                Take
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => respondToDouble?.(false)}>
                                Pass
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => respondToDouble?.(true, true, false)}
                                className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                                title="Take and immediately redouble (Beaver)"
                            >
                                Beaver
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => respondToDouble?.(true, false, true)}
                                className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                                title="Take and immediately redouble again (Raccoon)"
                            >
                                Raccoon
                            </Button>
                        </div>
                    )}

                    {/* Offer Double Button */}
                    {!gameState.doublePending && !gameState.winner && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => offerDouble?.()}
                            disabled={isLocal} // Disable for local for now or until logic supports it
                            className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                        >
                            Double
                        </Button>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => requestHint?.()}>
                        Hint
                    </Button>
                    <Button size="sm" variant="secondary">
                        Menu
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Board Area */}
                <div className="flex-1 flex justify-center items-center p-8 bg-black/10 relative">
                    {/* Board Background Glow */}
                    <div className="absolute inset-0 bg-radial-gradient from-purple-900/10 to-transparent pointer-events-none" />

                    <GameBoard
                        board={gameState.board.points}
                        whiteBar={gameState.board.whiteBar}
                        blackBar={gameState.board.blackBar}
                        whiteOff={gameState.board.whiteOff}
                        blackOff={gameState.board.blackOff}
                        dice={gameState.dice as [number, number]}
                        cubeValue={gameState.cubeLevel ?? 1}
                        cubeOwner={gameState.cubeOwner ?? null}
                        currentPlayer={gameState.currentPlayer}
                        lastMove={gameState.lastMove ?? undefined}
                        validMoves={gameState.validMoves}
                        onPointClick={handlePointClick}
                    />
                </div>

                {/* Sidebar */}
                <div className="w-80 border-l border-white/10 bg-wood-dark flex flex-col">
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Move History</h3>
                            <div className="h-48 overflow-y-auto bg-black/20 rounded p-2">
                                <MoveHistory moves={gameState.moveHistory} />
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col p-4">
                            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Chat</h3>
                            <div className="flex-1 bg-black/20 rounded overflow-hidden">
                                <GameChat roomId={gameId || "local-room"} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
