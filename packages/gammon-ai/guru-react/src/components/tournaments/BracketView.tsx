import React from 'react';
import { motion } from 'framer-motion';
import { Round, Match, TournamentParticipant } from '../../types/tournament';

interface BracketViewProps {
    rounds: Round[];
    participants: TournamentParticipant[];
}

const MatchCard: React.FC<{ match: Match; participants: TournamentParticipant[] }> = ({ match, participants }) => {
    const p1 = participants.find(p => p.id === match.player1Id);
    const p2 = participants.find(p => p.id === match.player2Id);

    return (
        <div className="bg-[#252525] border border-gray-800 rounded-lg p-3 w-64 mb-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">Table {match.tableNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${match.status === 'COMPLETED' ? 'bg-green-900 text-green-200' : 'bg-blue-900 text-blue-200'
                    }`}>
                    {match.status}
                </span>
            </div>

            <div className={`flex justify-between items-center p-2 rounded ${match.winnerId === match.player1Id ? 'bg-green-900/20' : ''}`}>
                <span className="font-medium text-white truncate max-w-[120px]">{p1?.username || 'Unknown'}</span>
                <span className="font-bold text-guru-gold">{match.player1Score}</span>
            </div>

            <div className={`flex justify-between items-center p-2 rounded mt-1 ${match.winnerId === match.player2Id ? 'bg-green-900/20' : ''}`}>
                <span className="font-medium text-white truncate max-w-[120px]">{p2?.username || 'Unknown'}</span>
                <span className="font-bold text-guru-gold">{match.player2Score}</span>
            </div>
        </div>
    );
};

export const BracketView: React.FC<BracketViewProps> = ({ rounds, participants }) => {
    return (
        <div className="flex gap-8 overflow-x-auto pb-8">
            {rounds.map((round, index) => (
                <motion.div
                    key={round.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex-shrink-0"
                >
                    <h3 className="text-lg font-bold text-guru-gold mb-4 text-center">Round {round.number}</h3>
                    <div className="flex flex-col gap-4">
                        {round.matches.map(match => (
                            <MatchCard key={match.id} match={match} participants={participants} />
                        ))}
                    </div>
                </motion.div>
            ))}
            {rounds.length === 0 && (
                <div className="w-full text-center text-gray-500 py-12">
                    Tournament hasn't started yet.
                </div>
            )}
        </div>
    );
};
