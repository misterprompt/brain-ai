import React from 'react';
import classNames from 'classnames';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'wood';
}

export const Card: React.FC<CardProps> = ({
    children,
    className,
    variant = 'default',
    ...props
}) => {
    const variants = {
        default: 'bg-elevated border border-white/10 shadow-lg',
        glass: 'bg-black/40 backdrop-blur-md border border-white/10 shadow-xl',
        wood: 'bg-wood-medium border-4 border-wood-border shadow-2xl'
    };

    return (
        <div
            className={classNames(
                'rounded-xl p-6',
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
