import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Mic, TrendingDown, Award, Zap } from 'lucide-react';

export interface AnalysisData {
    equityLoss: number;
    bestMove: string;
    explanation: string;
    isBlunder?: boolean;
}

interface CoachModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysis: AnalysisData | null;
    isLoading: boolean;
    onPlayAudio: () => void;
    onPlayVideo: () => void;
    quotaRemaining: number;
    onUpgrade: () => void;
}

export const CoachModal: React.FC<CoachModalProps> = ({
    isOpen,
    onClose,
    analysis,
    isLoading,
    onPlayAudio,
    onPlayVideo,
    quotaRemaining,
    onUpgrade
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[#121212] border border-[#333] rounded-2xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative flex flex-col max-h-[90vh]"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Header / Loading State */}
                    <div className="p-8 pb-0">
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-guru-gold to-yellow-200 uppercase tracking-tighter flex items-center gap-3">
                            <Award className="w-8 h-8 text-guru-gold" />
                            Ultimate Coach
                        </h2>
                        <p className="text-gray-400 mt-2 font-light">
                            DeepSeek R1 Analysis & Grandmaster Insights
                        </p>
                    </div>

                    <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                                <div className="relative w-24 h-24">
                                    <div className="absolute inset-0 border-4 border-[#333] rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-guru-gold rounded-full border-t-transparent animate-spin"></div>
                                    <Award className="absolute inset-0 m-auto w-10 h-10 text-guru-gold animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-white mb-2">Analyzing Position...</p>
                                    <p className="text-gray-500">Consulting GNUBg & DeepSeek R1</p>
                                </div>
                            </div>
                        ) : analysis ? (
                            <div className="space-y-8">
                                {/* Equity & Status */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#333] relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10">
                                            <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Equity Loss</div>
                                            <div className="text-5xl font-black text-red-500 flex items-center gap-2">
                                                <TrendingDown className="w-8 h-8" />
                                                {analysis.equityLoss.toFixed(3)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#333] relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10">
                                            <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Verdict</div>
                                            <div className={`text-3xl font-black ${analysis.isBlunder ? 'text-red-500' : 'text-yellow-500'}`}>
                                                {analysis.isBlunder ? 'BLUNDER' : 'INACCURACY'}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                Best move: <span className="text-white font-mono">{analysis.bestMove}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Explanation */}
                                <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#333]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-8 bg-guru-gold rounded-full" />
                                        <h3 className="text-xl font-bold text-white">Coach's Insight</h3>
                                    </div>
                                    <p className="text-gray-300 leading-relaxed text-lg font-light">
                                        {analysis.explanation}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={onPlayAudio}
                                        className="flex items-center justify-center gap-3 bg-[#222] hover:bg-[#333] border border-[#444] hover:border-guru-gold text-white p-4 rounded-xl transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Mic className="w-5 h-5 text-guru-gold" />
                                        </div>
                                        <span className="font-bold">Listen to Coach</span>
                                    </button>

                                    <button
                                        onClick={onPlayVideo}
                                        className="flex items-center justify-center gap-3 bg-[#222] hover:bg-[#333] border border-[#444] hover:border-guru-gold text-white p-4 rounded-xl transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Video className="w-5 h-5 text-guru-gold" />
                                        </div>
                                        <span className="font-bold">Watch Video</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-12">
                                No analysis available.
                            </div>
                        )}
                    </div>

                    {/* Footer / Quota */}
                    <div className="p-6 bg-[#0A0A0A] border-t border-[#333] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-400">
                                Daily Quota: <span className="text-white font-bold">{quotaRemaining}/5</span>
                            </div>
                            <div className="w-32 h-2 bg-[#222] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-guru-gold transition-all duration-500"
                                    style={{ width: `${(quotaRemaining / 5) * 100}%` }}
                                />
                            </div>
                        </div>

                        {quotaRemaining === 0 && (
                            <button
                                onClick={onUpgrade}
                                className="flex items-center gap-2 bg-gradient-to-r from-guru-gold to-yellow-600 text-black px-6 py-2 rounded-full font-bold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all"
                            >
                                <Zap className="w-4 h-4" />
                                Upgrade to Pro
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
