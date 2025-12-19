import React from 'react';
import { motion } from 'framer-motion';

interface EloDataPoint {
    date: string;
    rating: number;
}

interface EloGraphProps {
    data: EloDataPoint[];
}

export const EloGraph: React.FC<EloGraphProps> = ({ data }) => {
    const maxRating = Math.max(...data.map(d => d.rating)) + 50;
    const minRating = Math.min(...data.map(d => d.rating)) - 50;
    const range = maxRating - minRating;

    // Calculate points for SVG path
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.rating - minRating) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full h-64 bg-[#1e1e1e] border border-gray-800 rounded-xl p-6 relative overflow-hidden group">
            <h3 className="text-gray-400 text-sm font-bold mb-4 uppercase tracking-wider">Rating History (30 Days)</h3>

            <div className="relative h-40 w-full">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-600">
                    <span>{maxRating}</span>
                    <span>{Math.round((maxRating + minRating) / 2)}</span>
                    <span>{minRating}</span>
                </div>

                {/* Graph Area */}
                <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Area under curve */}
                    <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        d={`M0,100 ${points.split(' ').map(p => `L${p}`).join(' ')} L100,100 Z`}
                        fill="url(#gradient)"
                        stroke="none"
                    />

                    {/* Line */}
                    <motion.polyline
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        fill="none"
                        stroke="#FFD700"
                        strokeWidth="2"
                        points={points}
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Points on hover */}
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * 100;
                        const y = 100 - ((d.rating - minRating) / range) * 100;
                        return (
                            <g key={i} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <circle cx={`${x}%`} cy={`${y}%`} r="4" fill="#121212" stroke="#FFD700" strokeWidth="2" />
                                <rect x={`${x - 5}%`} y={`${y - 25}%`} width="10%" height="15%" rx="4" fill="#1e1e1e" className="pointer-events-none" />
                                <text x={`${x}%`} y={`${y - 15}%`} textAnchor="middle" fill="white" fontSize="4" className="pointer-events-none font-bold">
                                    {d.rating}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};
