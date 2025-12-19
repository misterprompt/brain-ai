import React from 'react';
import { Point } from './Point';
import { Dice } from './Dice';
import { Cube } from './Cube';

interface BoardProps {
    board: any;
    onMove: (from: number, to: number) => void;
    dice: number[];
    rolling: boolean;
    cubeValue: number;
    cubeOwner: 'white' | 'black' | null;
}

export const Board: React.FC<BoardProps> = ({ board, onMove, dice, rolling, cubeValue, cubeOwner }) => {
    return (
        <div className="relative w-full max-w-6xl aspect-[4/3] bg-[#2E1A10] rounded-xl border-[20px] border-[#1A0F0A] shadow-2xl flex overflow-hidden">
            {/* Wood Texture Overlay */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />

            {/* Left Quadrant */}
            <div className="flex-1 flex flex-col border-r-8 border-[#1A0F0A] relative">
                <div className="flex-1 flex border-b-2 border-[#1A0F0A]/30 bg-[#4E342E]">
                    {[12, 13, 14, 15, 16, 17].map(i => (
                        <Point key={i} index={i} isTop={true} checkers={getCheckersForPoint(board, i)} onMove={onMove} />
                    ))}
                </div>
                <div className="flex-1 flex bg-[#4E342E]">
                    {[11, 10, 9, 8, 7, 6].map(i => (
                        <Point key={i} index={i} isTop={false} checkers={getCheckersForPoint(board, i)} onMove={onMove} />
                    ))}
                </div>
            </div>

            {/* Bar */}
            <div className="w-20 bg-[#1A0F0A] flex flex-col items-center justify-center relative shadow-inner z-10">
                <div className="h-full w-2 bg-[#0F0805] absolute left-1/2 -translate-x-1/2" />
                {/* Bar Checkers Logic Here (Simplified) */}
            </div>

            {/* Right Quadrant */}
            <div className="flex-1 flex flex-col border-l-8 border-[#1A0F0A] relative">
                <div className="flex-1 flex border-b-2 border-[#1A0F0A]/30 bg-[#4E342E]">
                    {[18, 19, 20, 21, 22, 23].map(i => (
                        <Point key={i} index={i} isTop={true} checkers={getCheckersForPoint(board, i)} onMove={onMove} />
                    ))}
                </div>
                <div className="flex-1 flex bg-[#4E342E]">
                    {[5, 4, 3, 2, 1, 0].map(i => (
                        <Point key={i} index={i} isTop={false} checkers={getCheckersForPoint(board, i)} onMove={onMove} />
                    ))}
                </div>
            </div>

            {/* Center Overlay Elements */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                <div className="flex gap-12 items-center">
                    <Cube value={cubeValue} owner={cubeOwner} />
                    <Dice values={dice} rolling={rolling} />
                </div>
            </div>
        </div>
    );
};

// Helper
const getCheckersForPoint = (board: any, index: number) => {
    if (!board || !board.positions) return null;
    const count = board.positions[index];
    if (count === 0) return null;
    return {
        color: count > 0 ? 'white' : 'black',
        count: Math.abs(count)
    } as { color: 'white' | 'black'; count: number };
};
