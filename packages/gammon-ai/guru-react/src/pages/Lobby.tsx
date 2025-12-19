import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import { Play, Trophy, User, LogOut, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export const Lobby: React.FC = () => {
    const [games, setGames] = useState<any[]>([]);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const fetchGames = async () => {
            try {
                const { data } = await api.get('/games/available');
                setGames(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchGames();
        const interval = setInterval(fetchGames, 5000);
        return () => clearInterval(interval);
    }, []);

    const createGame = async (mode: 'AI_VS_PLAYER' | 'PLAYER_VS_PLAYER') => {
        try {
            const { data } = await api.post('/games', { mode, stake: 100 });
            window.location.href = `/game/${data.id}`;
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-guru-bg text-white">
            <nav className="border-b border-gray-800 bg-[#1a1a1a] p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <Link to="/lobby" className="text-2xl font-bold text-guru-gold">GuruGammon</Link>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-gray-400" />
                            <span>{user.username}</span>
                        </div>
                        <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="text-gray-400 hover:text-white">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Actions */}
                    <div className="space-y-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            onClick={() => createGame('AI_VS_PLAYER')}
                            className="w-full bg-gradient-to-r from-guru-gold to-yellow-600 p-6 rounded-xl font-bold text-black text-lg shadow-lg flex items-center justify-between"
                        >
                            <span>Play vs AI Coach</span>
                            <Play className="w-6 h-6" />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            onClick={() => createGame('PLAYER_VS_PLAYER')}
                            className="w-full bg-[#2d2d2d] border border-gray-700 p-6 rounded-xl font-bold text-white text-lg hover:bg-[#3d3d3d] transition-colors flex items-center justify-between"
                        >
                            <span>Create PvP Game</span>
                            <Users className="w-6 h-6" />
                        </motion.button>

                        <Link to="/tournaments">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="w-full mt-4 bg-[#1e1e1e] border border-guru-gold/30 p-6 rounded-xl font-bold text-guru-gold text-lg hover:bg-[#252525] transition-colors flex items-center justify-between"
                            >
                                <span>Tournaments</span>
                                <Trophy className="w-6 h-6" />
                            </motion.div>
                        </Link>
                    </div>

                    {/* Game List */}
                    <div className="md:col-span-2 bg-[#1e1e1e] rounded-xl border border-gray-800 p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Live Games
                        </h2>

                        <div className="space-y-3">
                            {games.length === 0 ? (
                                <div className="text-center text-gray-500 py-10">No active games found. Create one!</div>
                            ) : (
                                games.map(game => (
                                    <div key={game.id} className="bg-[#121212] p-4 rounded-lg flex justify-between items-center border border-gray-800 hover:border-gray-600 transition-colors">
                                        <div>
                                            <span className="font-bold text-white">{game.whitePlayer?.username || 'Unknown'}</span>
                                            <span className="text-gray-500 mx-2">vs</span>
                                            <span className="font-bold text-white">{game.blackPlayer?.username || 'Waiting...'}</span>
                                        </div>
                                        <Link
                                            to={`/game/${game.id}`}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
                                        >
                                            Watch / Join
                                        </Link>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
