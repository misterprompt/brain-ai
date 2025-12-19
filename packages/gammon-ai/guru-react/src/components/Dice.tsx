import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceProps {
    values: number[];
    rolling: boolean;
}

export const Dice: React.FC<DiceProps> = ({ values, rolling }) => {
    return (
        <div className="flex gap-4 pointer-events-none">
            <AnimatePresence mode='wait'>
                {values.map((val, i) => (
                    <Die key={`${i}-${rolling ? 'rolling' : val}`} value={val} rolling={rolling} index={i} />
                ))}
            </AnimatePresence>
        </div>
    );
};

const Die: React.FC<{ value: number; rolling: boolean; index: number }> = ({ value, rolling }) => {
    // 3D rotation variants
    const variants = {
        roll: {
            rotateX: [0, 360, 720, 1080],
            rotateY: [0, 360, 720, 1080],
            rotateZ: [0, 360, 720, 1080],
            y: [0, -50, 0, -30, 0],
            scale: [1, 1.2, 1],
            transition: { duration: 0.8, ease: "easeInOut" }
        },
        stop: {
            rotateX: 0,
            rotateY: 0,
            rotateZ: 0,
            y: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 20 }
        }
    };

    return (
        <motion.div
            variants={variants}
            animate={rolling ? "roll" : "stop"}
            className="w-12 h-12 bg-white rounded-xl shadow-xl flex items-center justify-center relative overflow-hidden border border-gray-200"
            style={{
                boxShadow: "inset -2px -2px 6px rgba(0,0,0,0.1), 2px 2px 8px rgba(0,0,0,0.2)"
            }}
        >
            <DotPattern value={value} />
        </motion.div>
    );
};

const DotPattern: React.FC<{ value: number }> = ({ value }) => {
    const dots = {
        1: ['center'],
        2: ['top-left', 'bottom-right'],
        3: ['top-left', 'center', 'bottom-right'],
        4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
        6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
    } as const;

    const positions = dots[value as keyof typeof dots] || [];

    return (
        <div className="relative w-full h-full p-2">
            {positions.map((pos, i) => (
                <div
                    key={i}
                    className={`absolute w-2.5 h-2.5 bg-black rounded-full shadow-sm
            ${pos === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
            ${pos === 'top-left' ? 'top-2 left-2' : ''}
            ${pos === 'top-right' ? 'top-2 right-2' : ''}
            ${pos === 'bottom-left' ? 'bottom-2 left-2' : ''}
            ${pos === 'bottom-right' ? 'bottom-2 right-2' : ''}
            ${pos === 'middle-left' ? 'top-1/2 left-2 -translate-y-1/2' : ''}
            ${pos === 'middle-right' ? 'top-1/2 right-2 -translate-y-1/2' : ''}
          `}
                />
            ))}
        </div>
    );
};
