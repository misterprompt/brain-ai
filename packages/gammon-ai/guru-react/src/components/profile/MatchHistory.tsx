import React from 'react';
import { Play, CheckCircle, XCircle, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GameRecord {
    id: string;
    opponent: string;
    result: 'WIN' | 'LOSS';
    score: string;
    date: string;
    accuracy: number; // GNUBg error rate
}

interface MatchHistoryProps {
    games: GameRecord[];
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ games }) => {
    return (
        <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Recent Matches</h3>
                <button className="text-sm text-guru-gold hover:underline">View All</button>
            </div>

            <div className="divide-y divide-gray-800">
                {games.map((game) => (
                    <div key={game.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${game.result === 'WIN' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                {game.result === 'WIN' ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-white">vs {game.opponent}</p>
                                <p className="text-xs text-gray-500">{new Date(game.date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-bold text-white">{game.score}</p>
                                <p className="text-xs text-gray-500 uppercase">{game.result}</p>
                            </div>

                            <div className="hidden md:flex items-center gap-2" title="GNUBg Error Rate">
                                <BarChart2 className="w-4 h-4 text-gray-500" />
                                <span className={`text-sm font-mono ${game.accuracy < 5 ? 'text-green-400' : game.accuracy < 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {game.accuracy.toFixed(1)}
                                </span>
                            </div>

                            <Link
                                to={`/game/${game.id}?replay=true`}
                                className="p-2 bg-gray-800 text-white rounded-lg hover:bg-guru-gold hover:text-black transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                            >
                                <Play className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
