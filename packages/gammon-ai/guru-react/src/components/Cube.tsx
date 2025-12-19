import React from 'react';
import { motion } from 'framer-motion';

interface CubeProps {
    value: number;
    owner: 'white' | 'black' | null;
}

export const Cube: React.FC<CubeProps> = ({ value, owner }) => {
    return (
        <motion.div
            initial={false}
            animate={{
                rotateY: owner === 'white' ? 0 : owner === 'black' ? 180 : 0,
                rotateX: [0, 360],
                scale: [1, 1.1, 1]
            }}
            transition={{ duration: 0.6, type: "spring" }}
            className="w-16 h-16 bg-gradient-to-br from-[#f0f0f0] to-[#d0d0d0] rounded-lg shadow-2xl flex items-center justify-center border border-gray-300 relative"
            style={{
                transformStyle: 'preserve-3d',
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
            }}
        >
            <span className="text-3xl font-black text-[#2d2d2d]">{value}</span>

            {/* 3D Thickness effect */}
            <div className="absolute inset-0 border-b-4 border-r-4 border-black/10 rounded-lg pointer-events-none" />
        </motion.div>
    );
};
