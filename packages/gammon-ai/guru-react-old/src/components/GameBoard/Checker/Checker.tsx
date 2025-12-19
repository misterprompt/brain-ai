import { type FC } from 'react';
import { motion } from 'framer-motion';
import './Checker.css';

export interface CheckerProps {
    player: 'white' | 'black';
    position: {
        point: number;
        stack: number;
    };
    isDragging?: boolean;
    isSelected?: boolean;
    onClick?: () => void;
}

export const Checker: FC<CheckerProps> = ({
    player,
    position,
    isDragging = false,
    isSelected = false,
    onClick
}) => {
    return (
        <motion.div
            className={`checker checker-${player} ${isSelected ? 'checker-selected' : ''} ${isDragging ? 'checker-dragging' : ''}`}
            onClick={onClick}
            whileHover={{ scale: 1.1, y: -4 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20
            }}
            layoutId={`checker-${position.point}-${position.stack}`}
        >
            {/* Inner circle for depth effect */}
            <div className="checker-inner" />

            {/* Selection ring */}
            {isSelected && <div className="checker-selection-ring" />}
        </motion.div>
    );
};
