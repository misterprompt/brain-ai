import React from 'react';
import { motion } from 'framer-motion';
import type { PlayerColor } from '@/types/game';

interface CheckerProps {
  color: PlayerColor;
  isSelected: boolean;
  onClick?: () => void;
}

const Checker: React.FC<CheckerProps> = ({ color, isSelected, onClick }) => {
  const checkerClass = color === 'white' ? 'checker-white' : 'checker-black';

  return (
    <motion.div
      layout
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 1
      }}
      className={`checker ${checkerClass} ${isSelected ? 'checker-selected' : ''}`}
      onClick={onClick}
      style={{
        border: isSelected ? '2px solid #ffd700' : undefined,
        boxShadow: isSelected ? '0 0 15px rgba(255, 215, 0, 0.6)' : undefined
      }}
    />
  );
};

export default Checker;
