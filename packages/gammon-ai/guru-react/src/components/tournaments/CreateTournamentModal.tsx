import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Users, Calendar, DollarSign } from 'lucide-react';
import { tournamentService } from '../../services/tournamentService';

interface CreateTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({ isOpen, onClose, onCreated }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        maxPlayers: 16,
        roundsTotal: 5,
        entryFee: 0,
        prizePool: 0,
        startTime: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await tournamentService.createTournament({
            ...formData,
            startTime: formData.startTime || new Date().toISOString()
        });
        onCreated();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
                    >
                        <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl w-full max-w-lg p-8 pointer-events-auto shadow-2xl shadow-guru-gold/10">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Trophy className="text-guru-gold" />
                                    Create Tournament
                                </h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Tournament Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-guru-gold focus:outline-none transition-colors"
                                        placeholder="e.g. Weekly Championship"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                                    <textarea
                                        className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-guru-gold focus:outline-none transition-colors h-24 resize-none"
                                        placeholder="Tournament details and rules..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            <Users className="w-4 h-4 inline mr-2" />
                                            Max Players
                                        </label>
                                        <input
                                            type="number"
                                            min="4"
                                            max="128"
                                            className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-guru-gold focus:outline-none transition-colors"
                                            value={formData.maxPlayers}
                                            onChange={e => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            <Calendar className="w-4 h-4 inline mr-2" />
                                            Rounds
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-guru-gold focus:outline-none transition-colors"
                                            value={formData.roundsTotal}
                                            onChange={e => setFormData({ ...formData, roundsTotal: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            <DollarSign className="w-4 h-4 inline mr-2" />
                                            Entry Fee
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-guru-gold focus:outline-none transition-colors"
                                            value={formData.entryFee}
                                            onChange={e => setFormData({ ...formData, entryFee: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            <DollarSign className="w-4 h-4 inline mr-2" />
                                            Prize Pool
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-guru-gold focus:outline-none transition-colors"
                                            value={formData.prizePool}
                                            onChange={e => setFormData({ ...formData, prizePool: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-guru-gold text-black font-bold py-4 rounded-lg hover:bg-yellow-400 transition-colors mt-4"
                                >
                                    Create Tournament
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
