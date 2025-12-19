import React, { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';

export const AuthPage: React.FC = () => {
    const [mode, setMode] = useState<'login' | 'register'>('login');

    return (
        <div className="container flex items-center justify-center min-h-[60vh]">
            <div className="card max-w-md w-full p-8">
                <div className="text-center mb-8">
                    <h2 className="mb-2">{mode === 'login' ? 'Welcome Back' : 'Join GuruGammon'}</h2>
                    <p className="text-muted">
                        {mode === 'login'
                            ? 'Enter your credentials to access your account.'
                            : 'Create an account to track your progress.'}
                    </p>
                </div>

                {mode === 'login' ? (
                    <LoginForm onAuthenticated={() => window.location.href = '/lobby'} />
                ) : (
                    <RegisterForm onRegistered={() => setMode('login')} />
                )}

                <div className="mt-6 text-center">
                    <button
                        className="btn btn-ghost text-sm"
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    >
                        {mode === 'login'
                            ? "Don't have an account? Register"
                            : "Already have an account? Login"}
                    </button>
                </div>
            </div>
        </div>
    );
};
