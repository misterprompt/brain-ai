import React from 'react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
    return (
        <div className="container flex-col items-center justify-center min-h-[80vh] text-center">
            <h1 className="text-4xl mb-8 text-glow-gold">Master the Board</h1>
            <p className="text-xl text-secondary max-w-2xl mb-12">
                Experience backgammon like never before. Premium aesthetics, powerful AI analysis, and real-time multiplayer.
            </p>

            <div className="flex gap-lg">
                <Link to="/lobby" className="btn btn-primary text-lg px-8 py-4">
                    Play Now
                </Link>
                <Link to="/auth" className="btn btn-secondary text-lg px-8 py-4">
                    Sign In
                </Link>
            </div>
        </div>
    );
};
