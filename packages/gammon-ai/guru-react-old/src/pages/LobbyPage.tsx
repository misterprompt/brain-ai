import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiClient } from '../api/client';
import { GameSession } from '../types/game';

export const LobbyPage: React.FC = () => {
    const navigate = useNavigate();
    const [games, setGames] = useState<GameSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGames = async () => {
        try {
            const response = await apiClient.getAvailableGames<{ games: GameSession[] }>();
            if (response && Array.isArray((response as any).games)) {
                setGames((response as any).games);
            } else if (Array.isArray(response)) {
                // Handle case where API returns array directly
                setGames(response as GameSession[]);
            }
        } catch (err) {
            console.error('Failed to fetch games:', err);
            setError('Failed to load games');
        }
    };

    useEffect(() => {
        fetchGames();
        // Poll for updates every 5 seconds
        const interval = setInterval(fetchGames, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateGame = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.createGame<any>({
                gameType: 'match',
                stake: 100,
                game_mode: 'AI_VS_PLAYER'
            });

            const anyResp = response as any;
            let newGameId = anyResp && anyResp.id;
            if (!newGameId && anyResp && anyResp.data) {
                newGameId = anyResp.data.id;
            }

            if (newGameId) {
                navigate(`/game/${newGameId}`);
            }
        } catch (err) {
            console.error('Failed to create game:', err);
            setError('Failed to create game');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container py-8">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-glow-gold">Game Lobby</h2>
                <Button onClick={handleCreateGame} isLoading={isLoading}>
                    Create New Game
                </Button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded text-red-200">
                    {error}
                </div>
            )}

            <div className="grid gap-md">
                {games.length === 0 ? (
                    <Card className="text-center text-muted py-8">
                        <p>No active games found.</p>
                        <p className="text-sm mt-2">Create a game to get started!</p>
                    </Card>
                ) : (
                    games.map(game => (
                        <Card key={game.id} className="flex justify-between items-center bg-black/20">
                            <div>
                                <h3 className="text-lg mb-1">Game #{game.id.slice(0, 8)}</h3>
                                <p className="text-sm text-muted">
                                    Status: <span className={game.status === 'WAITING' ? 'text-green-400' : 'text-yellow-400'}>{game.status}</span>
                                    {' • '}
                                    Type: {game.gameType}
                                </p>
                            </div>
                            <div className="flex gap-sm">
                                <Link to={`/game/${game.id}`}>
                                    <Button variant="secondary" size="sm">
                                        {game.status === 'WAITING' ? 'Join' : 'Spectate'}
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    ))
                )}

                <div className="mt-8 pt-8 border-t border-white/10">
                    <h3 className="text-xl mb-4">Quick Play</h3>
                    <div className="flex gap-md">
                        <Link to="/game/local">
                            <Button variant="secondary">
                                Practice vs AI (Local)
                            </Button>
                        </Link>
                        <Link to="/game/local">
                            <Button variant="ghost">
                                Local Multiplayer
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
