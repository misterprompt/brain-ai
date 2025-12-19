import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft, Plus, Search, Filter } from 'lucide-react';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types/tournament';
import { TournamentCard } from '../components/tournaments/TournamentCard';
import { CreateTournamentModal } from '../components/tournaments/CreateTournamentModal';
import { motion } from 'framer-motion';

export const Tournaments: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
    const [search, setSearch] = useState('');

    const fetchTournaments = async () => {
        try {
            const data = await tournamentService.getTournaments();
            setTournaments(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchTournaments();
    }, []);

    const filteredTournaments = tournaments.filter(t => {
        const matchesFilter = filter === 'ALL' || t.status === filter;
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-guru-bg text-white p-6">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <Link to="/lobby" className="p-2 bg-[#1e1e1e] rounded-full hover:bg-[#2d2d2d] transition-colors group">
                            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Trophy className="w-8 h-8 text-guru-gold" />
                                Tournaments
                            </h1>
                            <p className="text-gray-400 mt-1">Compete in Swiss-style tournaments and climb the ranks</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-guru-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-all hover:scale-105 shadow-lg shadow-guru-gold/20"
                    >
                        <Plus className="w-5 h-5" />
                        Create Tournament
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 bg-[#1e1e1e] p-4 rounded-xl border border-gray-800">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search tournaments..."
                            className="w-full bg-black/30 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-guru-gold focus:outline-none transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        <Filter className="w-5 h-5 text-gray-500 hidden md:block" />
                        {(['ALL', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === f
                                        ? 'bg-guru-gold text-black'
                                        : 'bg-black/30 text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                {f === 'ALL' ? 'All Events' : f.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTournaments.map((tournament, index) => (
                        <motion.div
                            key={tournament.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <TournamentCard tournament={tournament} />
                        </motion.div>
                    ))}
                </div>

                {filteredTournaments.length === 0 && (
                    <div className="text-center py-20">
                        <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-500">No tournaments found</h3>
                        <p className="text-gray-600">Try adjusting your filters or create a new one.</p>
                    </div>
                )}
            </div>

            <CreateTournamentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={fetchTournaments}
            />
        </div>
    );
};
