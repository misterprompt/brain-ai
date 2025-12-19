import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Flame, BookOpen } from 'lucide-react';

interface StatsOverviewProps {
    stats: {
        rating: number;
        winRate: number;
        streak: number;
        totalGames: number;
        favoriteOpening: string;
    };
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
    const cards = [
        {
            label: 'Current Rating',
            value: stats.rating,
            icon: Trophy,
            color: 'text-guru-gold',
            bg: 'bg-guru-gold/10',
            subtext: 'Top 5%'
        },
        {
            label: 'Win Rate',
            value: `${stats.winRate}%`,
            icon: TrendingUp,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            subtext: `${stats.totalGames} games played`
        },
        {
            label: 'Win Streak',
            value: stats.streak,
            icon: Flame,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            subtext: 'Personal Best: 12'
        },
        {
            label: 'Favorite Opening',
            value: stats.favoriteOpening,
            icon: BookOpen,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            subtext: '62% Win Rate'
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, index) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-4 hover:border-guru-gold/30 transition-colors"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-lg ${card.bg}`}>
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider">{card.label}</h4>
                        <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{card.subtext}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
