import React from 'react';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-guru-bg flex flex-col items-center justify-center z-50">
            <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-guru-gold rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-guru-gold font-bold tracking-widest animate-pulse">LOADING</p>
        </div>
    );
};
