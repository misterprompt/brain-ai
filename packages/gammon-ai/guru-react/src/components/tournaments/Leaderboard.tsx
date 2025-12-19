import React from 'react';
import { motion } from 'framer-motion';
import { TournamentParticipant } from '../../types/tournament';
import { Trophy, Medal } from 'lucide-react';

interface LeaderboardProps {
    participants: TournamentParticipant[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ participants }) => {
    const sortedParticipants = [...participants].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.tieBreaker - a.tieBreaker; // Secondary sort
    });

    return (
        <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Trophy className="text-guru-gold" />
                    Standings
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-black/20 text-gray-400 text-sm uppercase">
                        <tr>
                            <th className="px-6 py-4 font-medium">Rank</th>
                            <th className="px-6 py-4 font-medium">Player</th>
                            <th className="px-6 py-4 font-medium text-center">Score</th>
                            <th className="px-6 py-4 font-medium text-center">W-L</th>
                            <th className="px-6 py-4 font-medium text-center">Tie Break</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {sortedParticipants.map((p, index) => (
                            <motion.tr
                                key={p.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="hover:bg-white/5 transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {index === 0 && <Medal className="w-5 h-5 text-yellow-400" />}
                                        {index === 1 && <Medal className="w-5 h-5 text-gray-300" />}
                                        {index === 2 && <Medal className="w-5 h-5 text-amber-600" />}
                                        <span className={`font-mono ${index < 3 ? 'font-bold text-white' : 'text-gray-400'}`}>
                                            #{index + 1}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-white">
                                    {p.username}
                                    {p.isBye && <span className="ml-2 text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">BYE</span>}
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-guru-gold text-lg">
                                    {p.score}
                                </td>
                                <td className="px-6 py-4 text-center text-gray-300">
                                    {p.wins} - {p.losses}
                                </td>
                                <td className="px-6 py-4 text-center text-gray-500 font-mono">
                                    {p.tieBreaker}
                                </td>
                            </motion.tr>
                        ))}
                        {participants.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No participants yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
