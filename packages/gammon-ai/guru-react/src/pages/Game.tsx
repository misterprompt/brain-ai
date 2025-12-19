import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Board } from '../components/Board';
import { motion } from 'framer-motion';
import { Dices, Mic, MessageSquare, RotateCcw, Send, Eye, Award } from 'lucide-react';
import { CoachModal, AnalysisData } from '../components/CoachModal';

export const Game: React.FC = () => {
    const { id } = useParams();
    const [gameState, setGameState] = useState<any>(null);
    const [coachAdvice, setCoachAdvice] = useState<string | null>(null);
    const [loadingAdvice, setLoadingAdvice] = useState(false);
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<{ sender: string, text: string }[]>([]);
    const [rolling, setRolling] = useState(false);

    // Coach State
    const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [quotaRemaining, setQuotaRemaining] = useState(5);
    const [analyzing, setAnalyzing] = useState(false);
    const [recentAnalyses, setRecentAnalyses] = useState<AnalysisData[]>([]);

    const { lastMessage, sendMessage } = useWebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3001');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const { data } = await api.get(`/games/${id}`);
                setGameState(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchGame();
    }, [id]);

    useEffect(() => {
        if (lastMessage) {
            if (lastMessage.type === 'gameUpdate' && lastMessage.gameId === id) {
                setGameState(lastMessage.payload);
                setRolling(false);
                setCoachAdvice(null);
            }
            if (lastMessage.type === 'chat' && lastMessage.gameId === id) {
                setChatHistory(prev => [...prev, lastMessage.payload]);
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [lastMessage, id]);

    useEffect(() => {
        if (recentAnalyses.length > 0) {
            console.log("Analysis History:", recentAnalyses);
        }
    }, [recentAnalyses]);

    const handleMove = async (from: number, to: number) => {
        if (!gameState || isSpectator) return;
        try {
            await api.post(`/games/${id}/move`, { from, to });
        } catch (err) {
            console.error('Move failed', err);
        }
    };

    const handleRoll = async () => {
        if (isSpectator) return;
        setRolling(true);
        try {
            await api.post(`/games/${id}/roll`);
        } catch (err) {
            setRolling(false);
            console.error(err);
        }
    };

    const handleAnalyze = async () => {
        setIsCoachModalOpen(true);

        if (quotaRemaining <= 0) {
            return;
        }

        // Check cache (simplified: just check if we have the current analysis)
        // In a real app, we'd hash the board state
        if (analysisData && !analyzing) return;

        setAnalyzing(true);
        setAnalysisData(null);

        try {
            // Try actual API first
            // const evalRes = await api.post(`/games/${id}/evaluate`);
            // const coachRes = await api.post(`/games/${id}/coach`, { evaluation: evalRes.data });

            // Simulating API delay and response for "Ultimate Coach" experience
            await new Promise(resolve => setTimeout(resolve, 2500));

            const mockAnalysis: AnalysisData = {
                equityLoss: Math.random() * 0.5,
                bestMove: "24/18 13/7",
                explanation: "The AI suggests splitting the back checkers to challenge the opponent's control of the outer board. Your move was passive and allows the opponent to build a prime freely. By moving 24/18, you create an advanced anchor opportunity.",
                isBlunder: Math.random() > 0.7
            };

            setAnalysisData(mockAnalysis);
            setRecentAnalyses(prev => [mockAnalysis, ...prev].slice(0, 5));
            setQuotaRemaining(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Analysis failed", err);
        } finally {
            setAnalyzing(false);
        }
    };

    const getCoachAdvice = async () => {
        // Legacy simple advice
        setLoadingAdvice(true);
        try {
            const { data } = await api.post(`/games/${id}/coach`);
            setCoachAdvice(data.advice);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAdvice(false);
        }
    };

    const sendChat = () => {
        if (!chatMessage.trim()) return;
        sendMessage({ type: 'chat', gameId: id, payload: { sender: user.username, text: chatMessage } });
        setChatMessage('');
    };

    if (!gameState) return <div className="min-h-screen bg-guru-bg flex items-center justify-center text-white">Loading Game...</div>;

    const isPlayer1 = gameState.player1.id === user.id;
    const isPlayer2 = gameState.player2?.id === user.id;
    const isSpectator = !isPlayer1 && !isPlayer2;
    const isMyTurn = gameState.currentPlayer === (isPlayer1 ? 'white' : 'black');

    return (
        <div className="min-h-screen bg-[#0F0F0F] text-white flex flex-col font-sans">
            {/* Header */}
            <div className="bg-[#1A1A1A] border-b border-[#333] p-4 flex justify-between items-center shadow-lg z-20">
                <div className="flex items-center gap-8">
                    <div className={`flex items-center gap-3 ${gameState.currentPlayer === 'white' ? 'opacity-100' : 'opacity-50'}`}>
                        <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]" />
                        <span className="font-bold text-lg">{gameState.player1.name}</span>
                    </div>
                    <div className="text-2xl font-black text-guru-gold italic">VS</div>
                    <div className={`flex items-center gap-3 ${gameState.currentPlayer === 'black' ? 'opacity-100' : 'opacity-50'}`}>
                        <span className="font-bold text-lg text-right">{gameState.player2?.name || 'AI Coach'}</span>
                        <div className="w-3 h-3 rounded-full bg-red-800 shadow-[0_0_10px_red]" />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Ultimate Coach Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAnalyze}
                        className="bg-[#222] border border-guru-gold/50 text-guru-gold px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-guru-gold/10 transition-colors"
                    >
                        <Award className="w-5 h-5" />
                        Analyse GNUBg
                    </motion.button>

                    {isSpectator && (
                        <div className="flex items-center gap-2 text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full border border-blue-900">
                            <Eye className="w-4 h-4" /> Spectator Mode
                        </div>
                    )}

                    {isMyTurn && !isSpectator && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleRoll}
                            disabled={rolling}
                            className="bg-gradient-to-r from-guru-gold to-yellow-600 text-black px-8 py-2 rounded-full font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transition-shadow"
                        >
                            <Dices className={`w-5 h-5 ${rolling ? 'animate-spin' : ''}`} />
                            {rolling ? 'Rolling...' : 'Roll Dice'}
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chat Sidebar */}
                <div className="w-72 bg-[#121212] border-r border-[#333] flex flex-col">
                    <div className="p-4 border-b border-[#333] font-bold text-gray-400 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Live Chat
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className="text-sm">
                                <span className="font-bold text-guru-gold">{msg.sender}: </span>
                                <span className="text-gray-300">{msg.text}</span>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-4 border-t border-[#333] flex gap-2">
                        <input
                            className="flex-1 bg-[#222] border border-[#444] rounded px-3 py-2 text-sm focus:outline-none focus:border-guru-gold"
                            placeholder="Type a message..."
                            value={chatMessage}
                            onChange={e => setChatMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendChat()}
                        />
                        <button onClick={sendChat} className="p-2 bg-[#333] hover:bg-[#444] rounded text-guru-gold">
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Board Area */}
                <div className="flex-1 bg-[#050505] flex items-center justify-center p-8 relative overflow-hidden">
                    {/* Ambient Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] to-black opacity-50 pointer-events-none" />

                    <Board
                        board={gameState.board}
                        onMove={handleMove}
                        dice={gameState.dice.dice}
                        rolling={rolling}
                        cubeValue={gameState.cube.level}
                        cubeOwner={gameState.cube.owner}
                    />
                </div>

                {/* Coach Sidebar */}
                <div className="w-80 bg-[#121212] border-l border-[#333] flex flex-col">
                    <div className="p-4 border-b border-[#333] font-bold text-guru-gold flex items-center gap-2">
                        <ShieldIcon className="w-5 h-5" /> AI Coach
                    </div>

                    <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                        {!coachAdvice ? (
                            <div className="text-gray-500">
                                <p className="mb-4">Need help? Ask the Grandmaster.</p>
                                <button
                                    onClick={getCoachAdvice}
                                    disabled={loadingAdvice}
                                    className="px-6 py-3 bg-[#222] hover:bg-[#333] rounded-full text-white font-medium transition-all border border-[#444] hover:border-guru-gold flex items-center gap-2 mx-auto"
                                >
                                    {loadingAdvice ? (
                                        <RotateCcw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <MessageSquare className="w-4 h-4" />
                                    )}
                                    Analyze Position
                                </button>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#1A1A1A] p-5 rounded-xl border border-guru-gold/30 text-left w-full shadow-lg"
                            >
                                <div className="flex items-center gap-2 mb-3 text-guru-gold text-sm font-bold uppercase tracking-wider">
                                    <ShieldIcon className="w-4 h-4" /> Analysis
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed mb-4 font-light">
                                    {coachAdvice}
                                </p>
                                <button className="text-white text-xs bg-guru-gold/10 hover:bg-guru-gold/20 px-3 py-2 rounded flex items-center gap-2 transition-colors w-full justify-center">
                                    <Mic className="w-3 h-3" /> Listen to explanation
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>


            <CoachModal
                isOpen={isCoachModalOpen}
                onClose={() => setIsCoachModalOpen(false)}
                analysis={analysisData}
                isLoading={analyzing}
                onPlayAudio={() => console.log("Playing audio...")}
                onPlayVideo={() => console.log("Playing video...")}
                quotaRemaining={quotaRemaining}
                onUpgrade={() => alert("Upgrade flow placeholder")}
            />
        </div >
    );
};

const ShieldIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);
