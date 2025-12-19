import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Trophy, User, Shield } from 'lucide-react';

export const MobileNav: React.FC = () => {
    const navItems = [
        { path: '/lobby', icon: Home, label: 'Lobby' },
        { path: '/tournaments', icon: Trophy, label: 'Events' },
        { path: '/profile', icon: User, label: 'Profile' },
        { path: '/admin', icon: Shield, label: 'Admin' }, // Should be conditional
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 pb-safe md:hidden z-50">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center w-full h-full space-y-1
                            ${isActive ? 'text-guru-gold' : 'text-gray-500 hover:text-gray-300'}
                        `}
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </div>
    );
};
