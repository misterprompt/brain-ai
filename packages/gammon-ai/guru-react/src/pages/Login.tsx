import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, User } from 'lucide-react';

export const Login: React.FC = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const endpoint = isRegister ? '/auth/register' : '/auth/login';
            const payload = isRegister ? { email, password, username } : { email, password };

            const { data } = await api.post(endpoint, payload);

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            navigate('/lobby');
        } catch (err: any) {
            setError(err.response?.data?.error || 'An error occurred');
        }
    };

    const handleGuestLogin = async () => {
        try {
            const guestId = Math.floor(Math.random() * 100000);
            const payload = {
                username: `Guest_${guestId}`,
                email: `guest${guestId}@guru.com`,
                password: `guest${guestId}pass`
            };

            // Register the guest user
            const { data } = await api.post('/auth/register', payload);

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            navigate('/lobby');
        } catch (err) {
            console.error('Guest login failed', err);
            setError('Guest login failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-guru-bg flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1e1e1e] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-800"
            >
                <h2 className="text-3xl font-bold text-center mb-8 text-guru-gold">
                    {isRegister ? 'Create Account' : 'Welcome Back'}
                </h2>

                {error && (
                    <div className="bg-red-900/20 border border-red-900 text-red-200 p-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-guru-gold focus:border-transparent outline-none transition-all"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-guru-gold focus:border-transparent outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-guru-gold focus:border-transparent outline-none transition-all"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-guru-gold text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors flex items-center justify-center mt-6"
                    >
                        {isRegister ? <UserPlus className="mr-2 w-5 h-5" /> : <LogIn className="mr-2 w-5 h-5" />}
                        {isRegister ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                <div className="my-6 flex items-center">
                    <div className="flex-1 border-t border-gray-700"></div>
                    <span className="px-4 text-gray-500 text-sm">OR</span>
                    <div className="flex-1 border-t border-gray-700"></div>
                </div>

                <button
                    type="button"
                    onClick={handleGuestLogin}
                    className="w-full bg-[#2d2d2d] text-white font-bold py-3 rounded-lg hover:bg-[#3d3d3d] transition-colors flex items-center justify-center border border-gray-700"
                >
                    <User className="mr-2 w-5 h-5" /> Play as Guest
                </button>

                <div className="mt-6 text-center text-sm text-gray-500">
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-guru-gold hover:underline font-medium"
                    >
                        {isRegister ? 'Login' : 'Register'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
