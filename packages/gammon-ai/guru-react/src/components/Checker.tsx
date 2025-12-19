import React from 'react';
import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface CheckerProps {
    color: 'white' | 'black';
    count: number;
    pointIndex: number;
    canDrag: boolean;
}

export const Checker: React.FC<CheckerProps> = ({ color, count, pointIndex, canDrag }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'CHECKER',
        item: { color, fromPoint: pointIndex },
        canDrag: canDrag,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [color, pointIndex, canDrag]);

    // Premium colors
    const bgColor = color === 'white' ? 'bg-[#E8DCC4]' : 'bg-[#3A0000]'; // Cream vs Deep Red
    const borderColor = color === 'white' ? 'border-[#C0A080]' : 'border-[#1A0000]';
    const glowColor = color === 'white' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 0, 0, 0.4)';

    const checkers = [];
    const maxStack = 5;
    const displayCount = Math.min(count, maxStack);

    for (let i = 0; i < displayCount; i++) {
        const isTop = i === displayCount - 1;

        checkers.push(
            <motion.div
                key={i}
                ref={isTop ? drag : null}
                initial={false}
                className={clsx(
                    'w-10 h-10 md:w-12 md:h-12 rounded-full border-[3px] absolute shadow-md',
                    bgColor,
                    borderColor,
                    isTop && canDrag ? 'cursor-grab active:cursor-grabbing' : '',
                    isDragging && isTop ? 'opacity-0' : 'opacity-100'
                )}
                style={{
                    bottom: `${i * 10}px`, // Better stacking spacing
                    zIndex: i,
                    boxShadow: `
            inset 0 3px 6px rgba(255,255,255,0.3), 
            inset 0 -3px 6px rgba(0,0,0,0.4),
            0 4px 8px rgba(0,0,0,0.3)
          `
                }}
                whileHover={isTop && canDrag ? {
                    scale: 1.1,
                    y: -5,
                    boxShadow: `0 0 15px ${glowColor}, 0 10px 20px rgba(0,0,0,0.4)`
                } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                {/* Inner detail - Marble effect */}
                <div className="w-full h-full rounded-full opacity-30 bg-gradient-to-tr from-transparent via-white to-transparent" />

                {/* Center indentation */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 rounded-full shadow-inner bg-black/5 border border-white/10" />

                {isTop && count > maxStack && (
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-black/70 z-10">
                        {count}
                    </div>
                )}
            </motion.div>
        );
    }

    return (
        <div className="relative w-10 md:w-12 h-full flex flex-col-reverse items-center justify-start min-h-[60px]">
            {checkers}
        </div>
    );
};
