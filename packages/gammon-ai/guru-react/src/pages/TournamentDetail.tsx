import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Calendar, Trophy, Play, Eye, Clock } from 'lucide-react';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types/tournament';
import { BracketView } from '../components/tournaments/BracketView';
import { Leaderboard } from '../components/tournaments/Leaderboard';

export const TournamentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [activeTab, setActiveTab] = useState<'BRACKET' | 'STANDINGS'>('BRACKET');
    const [loading, setLoading] = useState(true);

    // Mock current user
    const currentUser = { id: 'u1', username: 'Me' };

    useEffect(() => {
        const fetchTournament = async () => {
            if (!id) return;
            const data = await tournamentService.getTournament(id);
            if (data) setTournament(data);
            setLoading(false);
        };
        fetchTournament();

        // Poll for updates (simulating WebSocket)
        const interval = setInterval(fetchTournament, 5000);
        return () => clearInterval(interval);
    }, [id]);

    const handleJoin = async () => {
        if (!tournament || !id) return;
        await tournamentService.joinTournament(id, currentUser);
        const updated = await tournamentService.getTournament(id);
        if (updated) setTournament(updated);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-guru-bg flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-guru-gold"></div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen bg-guru-bg flex items-center justify-center text-white">
                Tournament not found
            </div>
        );
    }

    const isParticipant = tournament.participants.some(p => p.userId === currentUser.id);

    return (
        <div className="min-h-screen bg-guru-bg text-white p-6">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <Link to="/tournaments" className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Tournaments
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-bold text-white">{tournament.name}</h1>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${tournament.status === 'REGISTRATION' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                                    tournament.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                                        'bg-gray-500/20 text-gray-400 border-gray-500/50'
                                    }`}>
                                    {tournament.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-gray-400 max-w-2xl">{tournament.description}</p>
                        </div>

                        <div className="flex gap-3">
                            {tournament.status === 'REGISTRATION' && !isParticipant && (
                                <button
                                    onClick={handleJoin}
                                    className="flex items-center gap-2 px-8 py-3 bg-guru-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-all hover:scale-105 shadow-lg shadow-guru-gold/20"
                                >
                                    <Play className="w-5 h-5" />
                                    Join Tournament
                                </button>
                            )}
                            {tournament.status === 'IN_PROGRESS' && (
                                <button className="flex items-center gap-2 px-6 py-3 bg-[#1e1e1e] border border-gray-700 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors">
                                    <Eye className="w-5 h-5" />
                                    Spectate Top Board
                                </button>
                            )}

                            {/* Admin Controls (Demo Only) */}
                            <div className="flex gap-2 ml-4 border-l border-gray-700 pl-4">
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        await tournamentService.simulateRoundResults(tournament.id);
                                        const updated = await tournamentService.getTournament(tournament.id);
                                        if (updated) setTournament(updated);
                                        setLoading(false);
                                    }}
                                    className="px-4 py-2 bg-red-900/50 text-red-200 text-xs font-bold rounded hover:bg-red-900 transition-colors"
                                >
                                    Simulate Results
                                </button>
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        await tournamentService.generatePairings(tournament.id);
                                        const updated = await tournamentService.getTournament(tournament.id);
                                        if (updated) setTournament(updated);
                                        setLoading(false);
                                    }}
                                    className="px-4 py-2 bg-blue-900/50 text-blue-200 text-xs font-bold rounded hover:bg-blue-900 transition-colors"
                                >
                                    Next Round
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Players</p>
                            <p className="text-xl font-bold">{tournament.currentPlayers} / {tournament.maxPlayers}</p>
                        </div>
                    </div>
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                            <Clock className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Round</p>
                            <p className="text-xl font-bold">{tournament.currentRound} / {tournament.roundsTotal}</p>
                        </div>
                    </div>
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <Calendar className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Start Time</p>
                            <p className="text-xl font-bold">{new Date(tournament.startTime).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/10 rounded-lg">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Prize Pool</p>
                            <p className="text-xl font-bold text-guru-gold">${tournament.prizePool}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-gray-800 mb-8">
                    <button
                        onClick={() => setActiveTab('BRACKET')}
                        className={`pb-4 px-2 text-lg font-bold transition-colors relative ${activeTab === 'BRACKET' ? 'text-guru-gold' : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        Bracket & Matches
                        {activeTab === 'BRACKET' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-1 bg-guru-gold rounded-t-full"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('STANDINGS')}
                        className={`pb-4 px-2 text-lg font-bold transition-colors relative ${activeTab === 'STANDINGS' ? 'text-guru-gold' : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        Standings
                        {activeTab === 'STANDINGS' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-1 bg-guru-gold rounded-t-full"
                            />
                        )}
                    </button>
                </div>

                {/* Content */}
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {activeTab === 'BRACKET' ? (
                        <BracketView rounds={tournament.rounds} participants={tournament.participants} />
                    ) : (
                        <Leaderboard participants={tournament.participants} />
                    )}
                </motion.div>
            </div>
        </div>
    );
};
