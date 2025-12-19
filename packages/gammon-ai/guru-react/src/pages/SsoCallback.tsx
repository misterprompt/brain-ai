import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export const SsoCallback = () => {
    const navigate = useNavigate();
    const { isSignedIn, isLoaded } = useAuth();

    useEffect(() => {
        if (isLoaded) {
            if (isSignedIn) {
                // Redirect to lobby after successful sign-in
                navigate('/lobby', { replace: true });
            } else {
                // If not signed in, redirect back to login
                navigate('/login', { replace: true });
            }
        }
    }, [isLoaded, isSignedIn, navigate]);

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-yellow-400 text-xl">
                Completing sign in...
            </div>
        </div>
    );
};
