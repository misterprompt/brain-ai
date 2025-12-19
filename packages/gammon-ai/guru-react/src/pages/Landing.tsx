import React from 'react';
import { motion } from 'framer-motion';
import { Dices, Trophy, Users, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Landing: React.FC = () => {
    return (
        <div className="min-h-screen bg-guru-bg text-white flex flex-col">
            {/* Hero Section */}
            <header className="container mx-auto px-6 py-16 flex-1 flex flex-col justify-center items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="flex items-center justify-center mb-6">
                        <Dices className="w-16 h-16 text-guru-gold mr-4 animate-spin-slow" />
                        <h1 className="text-6xl font-bold tracking-tighter bg-gradient-to-r from-guru-gold to-yellow-600 bg-clip-text text-transparent">
                            GuruGammon
                        </h1>
                    </div>
                    <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                        The most advanced Backgammon platform. Play, learn, and compete with AI coaching, Swiss tournaments, and a beautiful 3D interface.
                    </p>

                    <div className="flex gap-4 justify-center">
                        <Link to="/login" className="px-8 py-3 bg-guru-gold text-black font-bold rounded-full hover:bg-yellow-400 transition-colors flex items-center">
                            Play Now <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                        <Link to="/tournaments" className="px-8 py-3 border border-gray-600 rounded-full hover:bg-white/5 transition-colors">
                            View Tournaments
                        </Link>
                    </div>
                </motion.div>
            </header>

            {/* Features Grid */}
            <section className="bg-[#1a1a1a] py-20">
                <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
                    <FeatureCard
                        icon={<Trophy className="w-10 h-10 text-guru-gold" />}
                        title="Swiss Tournaments"
                        description="Fair pairing, automated rounds, and real-time leaderboards."
                    />
                    <FeatureCard
                        icon={<Shield className="w-10 h-10 text-guru-gold" />}
                        title="AI Coaching"
                        description="Get deep insights from our DeepSeek R1 powered coach after every move."
                    />
                    <FeatureCard
                        icon={<Users className="w-10 h-10 text-guru-gold" />}
                        title="Community"
                        description="Join a thriving community of passionate players from around the world."
                    />
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 text-center text-gray-600 text-sm">
                &copy; 2025 GuruGammon. Crafted with precision.
            </footer>
        </div>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-guru-bg p-8 rounded-2xl border border-gray-800 hover:border-guru-gold/30 transition-colors"
    >
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
    </motion.div>
);
