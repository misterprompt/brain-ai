// FIXED: Removed unused 'React' import - React 17+ automatic JSX runtime doesn't require it
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-guru-bg flex flex-col items-center justify-center p-6 text-center">
                    <h1 className="text-4xl font-bold text-red-500 mb-4">Oops!</h1>
                    <p className="text-gray-400 mb-8">Something went wrong. The Guru is meditating on this error.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-guru-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
