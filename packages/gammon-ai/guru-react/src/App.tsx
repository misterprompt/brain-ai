import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';
import { Profile } from './pages/Profile';
import { AdminPanel } from './pages/Admin';
import { MobileNav } from './components/layout/MobileNav';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

const API_URL = import.meta.env.VITE_API_URL || 'https://gurugammon.onrender.com';

const LoginScreen = () => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleGoogleLogin = () => {
        window.location.href = `${API_URL}/api/auth/google`;
    };

    const handleGuestLogin = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/guest`, { method: 'POST' });
            const data = await res.json();
            if (data.success && data.data.token) {
                localStorage.setItem('token', data.data.token);
                window.location.href = '/dashboard';
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 rounded-xl p-8 shadow-2xl border-2 border-yellow-500">
                <h1 className="text-4xl font-bold text-yellow-500 text-center mb-8">GuruGammon</h1>
                <button
                    onClick={handleGoogleLogin}
                    className="w-full py-4 px-6 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold text-lg transition-colors mb-4"
                >
                    🔐 Sign in with Google
                </button>
                <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-zinc-700"></div>
                    <span className="flex-shrink-0 mx-4 text-zinc-500 font-bold">OR</span>
                    <div className="flex-grow border-t border-zinc-700"></div>
                </div>
                <button
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                    className="w-full py-4 px-6 bg-zinc-800 hover:bg-zinc-700 text-yellow-500 rounded-lg font-bold text-lg transition-colors border-2 border-yellow-500"
                >
                    {isLoading ? '⏳ Creating...' : '👤 Play as Guest'}
                </button>
            </div>
        </div>
    );
};

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            localStorage.setItem('token', token);
            navigate('/dashboard', { replace: true });
        } else {
            navigate('/login', { replace: true });
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-yellow-500 text-2xl font-bold">Completing sign in...</div>
        </div>
    );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <div className="pb-16 md:pb-0">
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<LoginScreen />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/dashboard" element={<PrivateRoute><Lobby /></PrivateRoute>} />
                        <Route path="/lobby" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/game/:id" element={<PrivateRoute><Game /></PrivateRoute>} />
                        <Route path="/tournaments" element={<PrivateRoute><Tournaments /></PrivateRoute>} />
                        <Route path="/tournaments/:id" element={<PrivateRoute><TournamentDetail /></PrivateRoute>} />
                        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                        <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
                    </Routes>
                    <MobileNav />
                </div>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
