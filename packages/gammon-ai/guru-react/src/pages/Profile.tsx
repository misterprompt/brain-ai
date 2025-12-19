import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Share2, Crown, Zap, Trophy } from 'lucide-react';
import { EloGraph } from '../components/profile/EloGraph';
import { StatsOverview } from '../components/profile/StatsOverview';
import { MatchHistory } from '../components/profile/MatchHistory';

// Mock Data
const MOCK_STATS = {
    rating: 1850,
    winRate: 64,
    streak: 5,
    totalGames: 342,
    favoriteOpening: '24/13'
};

const MOCK_ELO_HISTORY = Array.from({ length: 30 }).map((_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
    rating: 1700 + Math.floor(Math.random() * 200) + (i * 5)
}));

const MOCK_HISTORY = Array.from({ length: 10 }).map((_, i) => ({
    id: `game_${i}`,
    opponent: `Player ${Math.floor(Math.random() * 100)}`,
    result: Math.random() > 0.4 ? 'WIN' : 'LOSS',
    score: Math.random() > 0.4 ? '7 - 3' : '4 - 7',
    date: new Date(Date.now() - i * 86400000).toISOString(),
    accuracy: 2 + Math.random() * 15
})) as any[];

export const Profile: React.FC = () => {
    return (
        <div className="min-h-screen bg-guru-bg text-white p-6 pb-20">
            <div className="container mx-auto max-w-6xl">
                {/* Header Profile Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-guru-gold to-yellow-600 p-1">
                                <img
                                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                                    alt="Avatar"
                                    className="w-full h-full rounded-full bg-[#1e1e1e]"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-[#1e1e1e] p-1.5 rounded-full">
                                <div className="bg-guru-gold text-black text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Crown className="w-3 h-3" /> PRO
                                </div>
                            </div>
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">Grandmaster Flash</h1>
                            <p className="text-gray-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Online Now
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button className="flex-1 md:flex-none py-2 px-4 bg-[#1e1e1e] border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                            <Share2 className="w-4 h-4" />
                            Share
                        </button>
                        <button className="flex-1 md:flex-none py-2 px-4 bg-[#1e1e1e] border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                            <Settings className="w-4 h-4" />
                            Edit
                        </button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Stats & Graph */}
                    <div className="lg:col-span-2 space-y-8">
                        <StatsOverview stats={MOCK_STATS} />
                        <EloGraph data={MOCK_ELO_HISTORY} />
                        <MatchHistory games={MOCK_HISTORY} />
                    </div>

                    {/* Right Column: Quota & Plan */}
                    <div className="space-y-6">
                        {/* Quota Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] border border-gray-800 rounded-xl p-6 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Zap className="w-24 h-24 text-guru-gold" />
                            </div>

                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-guru-gold" />
                                Analysis Quota
                            </h3>

                            <div className="mb-6">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Daily Analysis</span>
                                    <span className="text-white font-bold">12 / 50</span>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '24%' }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="h-full bg-guru-gold"
                                    />
                                </div>
                            </div>

                            <button className="w-full py-3 bg-guru-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-all shadow-lg shadow-guru-gold/10 flex items-center justify-center gap-2 group">
                                <Crown className="w-4 h-4" />
                                Upgrade to Unlimited
                            </button>
                        </motion.div>

                        {/* Achievements Preview (Placeholder) */}
                        <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Recent Achievements</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="aspect-square bg-black/30 rounded-lg flex items-center justify-center border border-gray-800 hover:border-guru-gold/50 transition-colors cursor-pointer" title="Achievement">
                                        <Trophy className={`w-6 h-6 ${i === 1 ? 'text-yellow-400' : 'text-gray-600'}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
