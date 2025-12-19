import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import '../styles/global.css';

export const MainLayout: React.FC = () => {
    const location = useLocation();
    const isGamePage = location.pathname.startsWith('/game');

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="container flex justify-between items-center">
                    <Link to="/" className="app-title text-glow-purple no-underline">
                        GuruGammon
                    </Link>

                    <nav className="flex gap-md items-center">
                        <Link to="/lobby" className={`nav-link ${location.pathname === '/lobby' ? 'active' : ''}`}>
                            Play
                        </Link>
                        <Link to="/leaderboard" className={`nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}>
                            Leaderboard
                        </Link>
                        {/* Auth status will go here */}
                    </nav>
                </div>
            </header>

            <main className={`app-main ${isGamePage ? 'game-mode' : ''}`}>
                <Outlet />
            </main>

            {!isGamePage && (
                <footer className="app-footer">
                    <div className="container text-center text-muted">
                        <p>&copy; 2025 GuruGammon. Premium Backgammon Experience.</p>
                    </div>
                </footer>
            )}
        </div>
    );
};
