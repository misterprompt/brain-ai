import { type FC } from 'react';
import './Point.css';
import Checker from '../Checker';

export interface PointProps {
    pointIndex: number;
    checkerCount: number; // Positive = white, Negative = black
    direction: 'up' | 'down';
    color: 'light' | 'dark';
    isValid?: boolean; // Can a piece be moved here?
    onClick?: () => void;
}

export const Point: FC<PointProps> = ({
    pointIndex,
    checkerCount,
    direction,
    color,
    isValid = false,
    onClick
}) => {
    const player = checkerCount > 0 ? 'white' : 'black';
    const absoluteCount = Math.abs(checkerCount);

    return (
        <div
            className={`point point-${direction} point-${color} ${isValid ? 'point-valid' : ''}`}
            onClick={onClick}
            data-point={pointIndex}
        >
            {/* Point Triangle */}
            <div className="point-triangle">
                <div className="point-number">{pointIndex + 1}</div>
            </div>

            {/* Checkers Stack */}
            {absoluteCount > 0 && (
                <div className="checkers-stack">
                    {Array.from({ length: Math.min(absoluteCount, 5) }).map((_, i) => (
                        <Checker
                            key={`checker-${pointIndex}-${i}`}
                            color={player}
                            isSelected={false}
                        />
                    ))}
                    {absoluteCount > 5 && (
                        <div className={`checker-count checker-count-${player}`}>
                            +{absoluteCount - 5}
                        </div>
                    )}
                </div>
            )}

            {/* Valid Move Indicator */}
            {isValid && (
                <div className="valid-indicator">
                    <div className="valid-pulse" />
                </div>
            )}
        </div>
    );
};
