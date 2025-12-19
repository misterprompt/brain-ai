import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Ban, Edit2, Link as LinkIcon, Activity, Users, Trophy } from 'lucide-react';

// Mock Data
const MOCK_ACTIVE_GAMES = [
    { id: 'g1', p1: 'Grandmaster Flash', p2: 'Newbie123', status: 'IN_PROGRESS', stake: 50 },
    { id: 'g2', p1: 'BackgammonKing', p2: 'DiceRoller', status: 'IN_PROGRESS', stake: 100 },
];

const MOCK_PLAYERS = [
    { id: 'p1', username: 'Grandmaster Flash', elo: 1850, status: 'ACTIVE' },
    { id: 'p2', username: 'Spammer99', elo: 1200, status: 'REPORTED' },
];

export const AdminPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'GAMES' | 'PLAYERS' | 'INVITES'>('GAMES');
    const [inviteLink, setInviteLink] = useState('');

    const generateInvite = () => {
        const link = `https://gurugammon.com/invite/${Math.random().toString(36).substr(2, 9)}`;
        setInviteLink(link);
        navigator.clipboard.writeText(link);
    };

    return (
        <div className="min-h-screen bg-guru-bg text-white p-6 pb-24">
            <div className="container mx-auto max-w-6xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-red-900/20 rounded-xl border border-red-900/50">
                        <Shield className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Admin Control Panel</h1>
                        <p className="text-gray-400">Restricted Access: Federation Admin</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Activity className="text-green-500" />
                            <h3 className="text-gray-400 font-bold">Active Games</h3>
                        </div>
                        <p className="text-3xl font-bold">24</p>
                    </div>
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="text-blue-500" />
                            <h3 className="text-gray-400 font-bold">Online Players</h3>
                        </div>
                        <p className="text-3xl font-bold">1,204</p>
                    </div>
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Trophy className="text-guru-gold" />
                            <h3 className="text-gray-400 font-bold">Active Tournaments</h3>
                        </div>
                        <p className="text-3xl font-bold">3</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-gray-800">
                    {['GAMES', 'PLAYERS', 'INVITES'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`pb-4 px-4 font-bold transition-colors relative ${activeTab === tab ? 'text-guru-gold' : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-1 bg-guru-gold rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
                    {activeTab === 'GAMES' && (
                        <table className="w-full text-left">
                            <thead className="bg-black/20 text-gray-400 text-sm uppercase">
                                <tr>
                                    <th className="px-6 py-4">Match ID</th>
                                    <th className="px-6 py-4">Players</th>
                                    <th className="px-6 py-4">Stake</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {MOCK_ACTIVE_GAMES.map(game => (
                                    <tr key={game.id} className="hover:bg-white/5">
                                        <td className="px-6 py-4 font-mono text-gray-500">{game.id}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-white">{game.p1}</span>
                                            <span className="text-gray-500 mx-2">vs</span>
                                            <span className="text-white">{game.p2}</span>
                                        </td>
                                        <td className="px-6 py-4 text-guru-gold">${game.stake}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs font-bold">
                                                {game.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-red-400 hover:text-red-300 text-sm font-bold border border-red-900/50 bg-red-900/20 px-3 py-1 rounded">
                                                Force End
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'PLAYERS' && (
                        <table className="w-full text-left">
                            <thead className="bg-black/20 text-gray-400 text-sm uppercase">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">ELO</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {MOCK_PLAYERS.map(player => (
                                    <tr key={player.id} className="hover:bg-white/5">
                                        <td className="px-6 py-4 font-bold">{player.username}</td>
                                        <td className="px-6 py-4 font-mono text-guru-gold">{player.elo}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${player.status === 'ACTIVE' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                                                }`}>
                                                {player.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Edit ELO">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 hover:bg-red-900/20 rounded text-red-400 hover:text-red-300" title="Ban Player">
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'INVITES' && (
                        <div className="p-8 flex flex-col items-center justify-center text-center">
                            <div className="p-4 bg-guru-gold/10 rounded-full mb-6">
                                <LinkIcon className="w-12 h-12 text-guru-gold" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Generate Invite Link</h3>
                            <p className="text-gray-400 mb-8 max-w-md">
                                Create a unique invitation link for new players. This link will bypass the waitlist.
                            </p>

                            {inviteLink ? (
                                <div className="w-full max-w-md bg-black/30 border border-gray-700 rounded-lg p-4 flex items-center justify-between gap-4">
                                    <code className="text-guru-gold font-mono text-sm truncate">{inviteLink}</code>
                                    <span className="text-green-400 text-xs font-bold whitespace-nowrap">Copied!</span>
                                </div>
                            ) : (
                                <button
                                    onClick={generateInvite}
                                    className="px-8 py-3 bg-guru-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-all hover:scale-105 shadow-lg shadow-guru-gold/20"
                                >
                                    Generate New Link
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
