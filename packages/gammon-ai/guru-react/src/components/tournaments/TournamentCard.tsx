import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Tournament } from '../../types/tournament';
import { Link } from 'react-router-dom';

interface TournamentCardProps {
    tournament: Tournament;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament }) => {
    const statusColors = {
        REGISTRATION: 'bg-green-500/20 text-green-400 border-green-500/50',
        IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        COMPLETED: 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, translateY: -5 }}
            className="group relative bg-[#1e1e1e] border border-gray-800 rounded-xl p-6 overflow-hidden transition-all duration-300 hover:border-guru-gold/50 hover:shadow-lg hover:shadow-guru-gold/10"
        >
            {/* Background Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-guru-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-guru-gold/10 rounded-lg">
                        <Trophy className="w-6 h-6 text-guru-gold" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[tournament.status]}`}>
                        {tournament.status.replace('_', ' ')}
                    </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-guru-gold transition-colors">
                    {tournament.name}
                </h3>

                <p className="text-gray-400 text-sm mb-6 line-clamp-2 h-10">
                    {tournament.description}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>{tournament.currentPlayers} / {tournament.maxPlayers}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(tournament.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{tournament.roundsTotal} Rounds</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-bold text-guru-gold">$</span>
                        <span>{tournament.prizePool} Prize</span>
                    </div>
                </div>

                <Link
                    to={`/tournaments/${tournament.id}`}
                    className="flex items-center justify-center w-full py-3 bg-gray-800 hover:bg-guru-gold text-white hover:text-black font-bold rounded-lg transition-all duration-300 group-hover:translate-y-0"
                >
                    <span>View Details</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </motion.div>
    );
};
