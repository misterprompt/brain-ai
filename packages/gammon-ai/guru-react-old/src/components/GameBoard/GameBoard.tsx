import React, { useEffect, useRef } from 'react';
import Checker from './Checker';
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../../utils/SoundManager';
import './GameBoard.css';
import './Interactive.css';

export interface GameBoardProps {
    board: number[];
    whiteBar: number;
    blackBar: number;
    whiteOff: number;
    blackOff: number;
    dice: [number, number];
    /** Indique si une animation de roulage de dés est en cours. */
    isRollingDice?: boolean;
    cubeValue: number;
    cubeOwner: string | null;
    currentPlayer: 'white' | 'black';
    /** Dernier coup joué (indices 0-23), utilisé pour le surlignage visuel. */
    lastMove?: { from: number; to: number } | null;
    /** Index sélectionné localement (mode jeu local), pour l'UI. */
    selectedPoint?: number | null;
    /** Destinations valides calculées localement (mode jeu local), pour l'UI. */
    validMoves?: number[];
    /** Coup suggéré par l'IA à surligner sur le plateau. */
    hintMove?: { from: number; to: number } | null;
    onPointClick?: (pointIndex: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
    board,
    whiteBar,
    blackBar,
    whiteOff,
    blackOff,
    dice,
    isRollingDice,
    cubeValue,
    currentPlayer,
    lastMove,
    hintMove,
    selectedPoint,
    validMoves,
    onPointClick
}) => {
    // Sound Effects Integration
    const prevDiceRef = useRef(dice);
    const prevBoardRef = useRef(board);

    useEffect(() => {
        // Play dice sound when dice change and are not [0,0]
        if (dice[0] !== 0 && (dice[0] !== prevDiceRef.current[0] || dice[1] !== prevDiceRef.current[1])) {
            soundManager.play('diceRoll');
        }
        prevDiceRef.current = dice;
    }, [dice]);

    useEffect(() => {
        // Simple heuristic for move sounds: if board changes, play sound
        // In a real app, we might want to distinguish between move and hit based on logic
        const boardChanged = board.some((count, i) => count !== prevBoardRef.current[i]);
        if (boardChanged) {
            soundManager.play('checkerMove');
        }
        prevBoardRef.current = board;
    }, [board]);


    // Dynamic Lighting Effect
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--light-x', `${x}px`);
        e.currentTarget.style.setProperty('--light-y', `${y}px`);
    };

    // Split board into quadrants for proper backgammon layout
    // From white's perspective (bottom):
    // Bottom Right: Points 1-6 (Right to Left visually: 6, 5, 4, 3, 2, 1) -> 1 is Edge
    // Bottom Left: Points 7-12 (Right to Left visually: 12, 11, 10, 9, 8, 7) -> 12 is Edge
    // Top Left: Points 13-18 (Left to Right visually: 13, 14, 15, 16, 17, 18) -> 13 is Edge
    // Top Right: Points 19-24 (Left to Right visually: 19, 20, 21, 22, 23, 24) -> 24 is Edge

    const bottomRight = board.slice(0, 6);        // Points 1-6
    const bottomLeft = board.slice(6, 12);        // Points 7-12
    const topLeft = board.slice(12, 18);          // Points 13-18 (No reverse needed for Left-to-Right render)
    const topRight = board.slice(18, 24);         // Points 19-24 (No reverse needed for Left-to-Right render)

    // Render a point (triangle) and its stack of animated checkers
    const renderPoint = (checkerCount: number, pointNumber: number, direction: 'up' | 'down', colorClass: 'light' | 'dark') => {
        // Les points dans le tableau board sont 0-indexés (0-23), mais pointNumber est 1-24
        // L'index réel dans le tableau board[]
        const boardIndex = pointNumber - 1;

        const isSelected = selectedPoint === boardIndex;
        const isValidMove = Array.isArray(validMoves) && validMoves.includes(boardIndex);

        const isLastFrom = lastMove && lastMove.from === boardIndex;
        const isLastTo = lastMove && lastMove.to === boardIndex;
        const isHintFrom = hintMove && hintMove.from === boardIndex;
        const isHintTo = hintMove && hintMove.to === boardIndex;

        const player = checkerCount > 0 ? 'white' : 'black';
        const absoluteCount = Math.abs(checkerCount);

        const pointClasses = [
            'point',
            `point-${direction}`,
            `point-${colorClass}`,
            isSelected ? 'point-selected' : '',
            isValidMove ? 'point-valid-move' : '',
            isLastFrom ? 'point-last-from' : '',
            isLastTo ? 'point-last-to' : '',
            isHintFrom ? 'point-hint-from' : '',
            isHintTo ? 'point-hint-to' : ''
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div
                key={`point-${pointNumber}`}
                className={pointClasses}
                onClick={() => onPointClick?.(boardIndex)}
                style={{ cursor: 'pointer' }}
            >
                <div className="point-triangle">
                    <div className="point-number">{pointNumber}</div>
                </div>
                <div className="checkers-stack">
                    <AnimatePresence mode='popLayout'>
                        {Array.from({ length: Math.min(absoluteCount, 5) }).map((_, i) => (
                            <Checker
                                key={`checker-${boardIndex}-${i}`} // Stable key for layout animations? Ideally should be unique ID if possible
                                color={player}
                                isSelected={false}
                            />
                        ))}
                    </AnimatePresence>
                    {absoluteCount > 5 && (
                        <div className={`checker-count checker-count-${player}`}>
                            +{absoluteCount - 5}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render dice
    const renderDice = () => {
        const renderPips = (value: number) => {
            // Validate dice value
            if (!value || value < 1 || value > 6) {
                return <div className="die-face" />;
            }

            const pipPositions: Record<number, number[][]> = {
                1: [[1, 1]],
                2: [[0, 0], [2, 2]],
                3: [[0, 0], [1, 1], [2, 2]],
                4: [[0, 0], [0, 2], [2, 0], [2, 2]],
                5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
                6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]]
            };

            const positions = pipPositions[value] || [];

            return (
                <div className="die-face">
                    {positions.map(([row, col], index) => (
                        <div
                            key={`pip-${index}`}
                            className="die-pip"
                            style={{
                                gridRow: row + 1,
                                gridColumn: col + 1
                            }}
                        />
                    ))}
                </div>
            );
        };

        const valuesToRender = dice.length > 0 ? dice : [0, 0];

        return (
            <div className="dice-container">
                {valuesToRender.map((value, index) => (
                    <motion.div
                        key={`die-${index}`}
                        className="die"
                        animate={isRollingDice ? {
                            rotate: [0, 360, 720],
                            y: [0, -20, 0],
                            scale: [1, 1.1, 1]
                        } : {
                            rotate: 0,
                            y: 0,
                            scale: 1
                        }}
                        transition={isRollingDice ? {
                            duration: 0.6,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        } : {
                            type: "spring",
                            stiffness: 300,
                            damping: 20
                        }}
                    >
                        {isRollingDice ? <div className="die-face blur-effect" /> : renderPips(value)}
                    </motion.div>
                ))}
            </div>
        );
    };

    return (
        <LayoutGroup>
            <div className="game-board-container">
                <div
                    className="game-board"
                    onMouseMove={handleMouseMove}
                    style={{ '--light-x': '50%', '--light-y': '50%' } as React.CSSProperties}
                >
                    {/* Top Half */}
                    <div className="board-half board-top">
                        {/* Top Left Quadrant (Points 13-18) */}
                        <div className="quadrant quadrant-top-left">
                            {topLeft.map((checkers, index) =>
                                renderPoint(checkers, 13 + index, 'down', (13 + index) % 2 === 0 ? 'dark' : 'light')
                            )}
                        </div>

                        <div className="bar">
                            {whiteBar > 0 && (
                                <div className="bar-checkers bar-checkers-top">
                                    <AnimatePresence mode='popLayout'>
                                        {Array.from({ length: whiteBar }).map((_, i) => (
                                            <Checker
                                                key={`bar-white-${i}`}
                                                color="white"
                                                isSelected={false}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {/* Top Right Quadrant (Points 19-24) */}
                        <div className="quadrant quadrant-top-right">
                            {topRight.map((checkers, index) =>
                                renderPoint(checkers, 19 + index, 'down', (19 + index) % 2 === 0 ? 'dark' : 'light')
                            )}
                        </div>
                    </div>

                    {/* Middle - Dice and Cube */}
                    <div className="board-middle">
                        {renderDice()}
                        <div className="doubling-cube">
                            <div className="cube-face">
                                <div className="cube-value">{cubeValue}</div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Half */}
                    <div className="board-half board-bottom">
                        {/* Bottom Left Quadrant (Points 12-7) */}
                        <div className="quadrant quadrant-bottom-left">
                            {bottomLeft.slice().reverse().map((checkers, index) =>
                                renderPoint(checkers, 12 - index, 'up', (12 - index) % 2 === 0 ? 'dark' : 'light')
                            )}
                        </div>

                        <div className="bar">
                            {blackBar > 0 && (
                                <div className="bar-checkers bar-checkers-bottom">
                                    <AnimatePresence mode='popLayout'>
                                        {Array.from({ length: blackBar }).map((_, i) => (
                                            <Checker
                                                key={`bar-black-${i}`}
                                                color="black"
                                                isSelected={false}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {/* Bottom Right Quadrant (Points 6-1) */}
                        <div className="quadrant quadrant-bottom-right">
                            {bottomRight.slice().reverse().map((checkers, index) =>
                                renderPoint(checkers, 6 - index, 'up', (6 - index) % 2 === 0 ? 'dark' : 'light')
                            )}
                        </div>
                    </div>

                    {/* Off Sections */}
                    <div className="off-section off-white" onClick={() => onPointClick?.(24)}>
                        <div className="off-label">White Off</div>
                        <div className="off-checkers">
                            <AnimatePresence mode='popLayout'>
                                {Array.from({ length: whiteOff }).map((_, i) => (
                                    <Checker
                                        key={`off-white-${i}`}
                                        color="white"
                                        isSelected={false}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="off-section off-black" onClick={() => onPointClick?.(-1)}>
                        <div className="off-label">Black Off</div>
                        <div className="off-checkers">
                            <AnimatePresence mode='popLayout'>
                                {Array.from({ length: blackOff }).map((_, i) => (
                                    <Checker
                                        key={`off-black-${i}`}
                                        color="black"
                                        isSelected={false}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Current Player Indicator */}
                <div className="current-player-indicator">
                    <span className={`indicator-dot ${currentPlayer === 'white' ? 'white' : 'black'}`} />
                    <span className="indicator-text">
                        {currentPlayer === 'white' ? 'White' : 'Black'} to play
                    </span>
                </div>
            </div>
        </LayoutGroup>
    );
};
