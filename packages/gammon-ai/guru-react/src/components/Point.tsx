import React from 'react';
import { useDrop } from 'react-dnd';
import clsx from 'clsx';
import { Checker } from './Checker';

interface PointProps {
    index: number;
    checkers: { color: 'white' | 'black'; count: number } | null;
    onMove: (from: number, to: number) => void;
    isTop: boolean;
    highlight?: boolean;
    canMoveTo?: boolean;
}

export const Point: React.FC<PointProps> = ({ index, checkers, onMove, isTop, highlight, canMoveTo }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'CHECKER',
        drop: (item: { fromPoint: number }) => {
            onMove(item.fromPoint, index);
        },
        canDrop: () => canMoveTo ?? true,
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }), [index, onMove, canMoveTo]);

    const isEven = index % 2 === 0;
    // Wood texture colors
    const pointColor = isEven ? 'border-b-[#3E2723]' : 'border-b-[#1A100C]'; // Dark Wood vs Darker Wood
    const topPointColor = isEven ? 'border-t-[#3E2723]' : 'border-t-[#1A100C]';

    const triangleClass = isTop
        ? `border-l-[20px] border-r-[20px] md:border-l-[35px] md:border-r-[35px] border-b-[150px] md:border-b-[240px] border-l-transparent border-r-transparent ${pointColor}`
        : `border-l-[20px] border-r-[20px] md:border-l-[35px] md:border-r-[35px] border-t-[150px] md:border-t-[240px] border-l-transparent border-r-transparent ${topPointColor}`;

    return (
        <div
            ref={drop}
            className={clsx(
                'relative h-full flex justify-center flex-1 min-w-[40px] md:min-w-[70px]',
                isTop ? 'items-start' : 'items-end',
                isOver && 'bg-white/5 rounded-lg',
                highlight && 'bg-yellow-500/10'
            )}
        >
            {/* The Triangle */}
            <div className={clsx('absolute w-0 h-0 pointer-events-none filter drop-shadow-lg', isTop ? 'top-0' : 'bottom-0', triangleClass)} />

            {/* Checkers Container */}
            <div className={clsx('z-10 h-[85%] flex flex-col justify-end', isTop ? 'mt-4' : 'mb-4')}>
                {checkers && checkers.count > 0 && (
                    <Checker
                        color={checkers.color}
                        count={checkers.count}
                        pointIndex={index}
                        canDrag={true}
                    />
                )}
            </div>

            {/* Point Index Label */}
            <span className={clsx(
                "absolute text-[10px] font-mono text-[#8D6E63] opacity-50",
                isTop ? "top-1" : "bottom-1"
            )}>
                {index + 1}
            </span>
        </div>
    );
};
