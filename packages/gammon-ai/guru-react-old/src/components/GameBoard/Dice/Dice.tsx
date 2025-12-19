import { type FC } from 'react';
import { motion } from 'framer-motion';
import './Dice.css';

export interface DiceProps {
    dice: [number, number];
    isRolling?: boolean;
}

export const Dice: FC<DiceProps> = ({ dice, isRolling = false }) => {
    const dotPositions = [
        [], // 0 (not used)
        ['center'], // 1
        ['top-left', 'bottom-right'], // 2
        ['top-left', 'center', 'bottom-right'], // 3
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'], // 4
        ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'], // 5
        ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'], // 6
    ];

    const getPositionClass = (position: string) => {
        switch (position) {
            case 'top-left': return 'top-1 left-1';
            case 'top-right': return 'top-1 right-1';
            case 'middle-left': return 'top-1/2 left-1 -translate-y-1/2';
            case 'middle-right': return 'top-1/2 right-1 -translate-y-1/2';
            case 'bottom-left': return 'bottom-1 left-1';
            case 'bottom-right': return 'bottom-1 right-1';
            case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
            default: return '';
        }
    };

    return (
        <div className="dice-container">
            {dice.map((value, index) => (
                <motion.div
                    key={`die-${index}`}
                    className={`die ${isRolling ? 'die-rolling' : ''}`}
                    initial={{ rotateX: 0, rotateY: 0, rotateZ: 0 }}
                    animate={
                        isRolling
                            ? {
                                rotateX: [0, 360, 720],
                                rotateY: [0, 360, 720],
                                rotateZ: [0, 180, 360]
                            }
                            : { rotateX: 0, rotateY: 0, rotateZ: 0 }
                    }
                    transition={{
                        duration: 0.6,
                        ease: 'easeOut'
                    }}
                >
                    <motion.div 
                        className="relative w-16 h-16 bg-gray-200 rounded-md shadow-inner flex justify-center items-center"
                        animate={isRolling ? { rotate: 360 } : { rotate: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        {dotPositions[value]?.map((position) => (
                            <div 
                                key={position}
                                className={`absolute w-3 h-3 bg-black rounded-full ${getPositionClass(position)}`}
                            />
                        ))}
                    </motion.div>
                </motion.div>
            ))}
        </div>
    );
};
