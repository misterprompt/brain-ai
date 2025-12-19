import { type FC } from 'react';
import { motion } from 'framer-motion';
import './DoublingCube.css';

export interface DoublingCubeProps {
    value: number;
    owner: string | null; // null = centered, 'white' | 'black' = owned
    canDouble?: boolean;
    onDouble?: () => void;
}

export const DoublingCube: FC<DoublingCubeProps> = ({
    value,
    owner,
    canDouble = false,
    onDouble
}) => {
    return (
        <motion.div
            className={`doubling-cube ${owner ? `cube-owned-${owner}` : 'cube-centered'} ${canDouble ? 'cube-can-double' : ''}`}
            onClick={canDouble ? onDouble : undefined}
            whileHover={canDouble ? { scale: 1.1, rotateY: 180 } : {}}
            whileTap={canDouble ? { scale: 0.95 } : {}}
            transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20
            }}
        >
            <div className="cube-face">
                <div className="cube-value">{value}</div>
            </div>

            {owner && (
                <div className={`cube-owner-indicator cube-owner-${owner}`}>
                    {owner}
                </div>
            )}

            {canDouble && (
                <div className="cube-double-hint">
                    Double?
                </div>
            )}
        </motion.div>
    );
};
