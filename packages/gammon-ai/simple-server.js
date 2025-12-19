// Simple backend server for GuruGammon - Robust & Authoritative
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/game' });

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const games = new Map();
const connections = new Map();

// Mock user for testing
const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    username: 'GuruPlayer',
    firstName: 'Guru',
    lastName: 'Master'
};

// Standard Backgammon Initial Board (White moves 24->1, Black moves 1->24)
// Indices 0-23. 
// White: 5 on 5 (idx 5), 3 on 7 (idx 7), 5 on 12 (idx 12), 2 on 23 (idx 23) -> Wait, let's match frontend exactly.
// Frontend INITIAL_BOARD:
// 1-6: Pt 1 (2 Black), Pt 6 (5 White) -> Index 0: -2, Index 5: 5
// 7-12: Pt 8 (3 White), Pt 12 (5 Black) -> Index 7: 3, Index 11: -5
// 13-18: Pt 13 (5 White), Pt 17 (3 Black) -> Index 12: 5, Index 16: -3
// 19-24: Pt 19 (5 Black), Pt 24 (2 White) -> Index 18: -5, Index 23: 2
const INITIAL_BOARD = [
    -2, 0, 0, 0, 0, 5,   // 1-6
    0, 3, 0, 0, 0, -5,   // 7-12
    5, 0, 0, 0, -3, 0,   // 13-18
    -5, 0, 0, 0, 0, 2    // 19-24
];

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth endpoints (mock)
app.post('/api/auth/register', (req, res) => res.json({ user: mockUser, token: 'mock-token' }));
app.post('/api/auth/login', (req, res) => res.json({ user: mockUser, token: 'mock-token' }));

// Game endpoints
app.post('/api/games', (req, res) => {
    const gameId = `game-${Date.now()}`;
    const game = {
        id: gameId,
        player1: mockUser,
        player2: null,
        status: 'waiting',
        board: {
            points: [...INITIAL_BOARD],
            whiteBar: 0,
            blackBar: 0,
            whiteOff: 0,
            blackOff: 0
        },
        currentPlayer: 'white',
        dice: [], // [die1, die2]
        turnState: {
            movesLeft: [], // [die1, die2, die1, die2] for doubles
            hasRolled: false
        },
        winner: null,
        createdAt: new Date().toISOString()
    };

    games.set(gameId, game);
    res.json(game);
});

app.get('/api/games/:gameId/status', (req, res) => {
    const game = games.get(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
});

app.post('/api/games/:gameId/join', (req, res) => {
    const game = games.get(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    game.player2 = { ...mockUser, id: 'user-2', username: 'Challenger' };
    game.status = 'playing';

    broadcastToGame(req.params.gameId, { type: 'GAME_UPDATE', payload: game });
    res.json(game);
});

app.post('/api/games/:gameId/roll', (req, res) => {
    const game = games.get(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    // Simple turn logic: can only roll if haven't rolled yet
    if (game.turnState.hasRolled) {
        return res.status(400).json({ error: 'Already rolled' });
    }

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const isDouble = die1 === die2;

    game.dice = [die1, die2];
    game.turnState.hasRolled = true;
    game.turnState.movesLeft = isDouble ? [die1, die1, die1, die1] : [die1, die2];

    broadcastToGame(req.params.gameId, {
        type: 'DICE_ROLLED',
        payload: { dice: game.dice, moves: game.turnState.movesLeft, currentPlayer: game.currentPlayer }
    });

    res.json({ dice: game.dice });
});

app.post('/api/games/:gameId/move', (req, res) => {
    const game = games.get(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const { from, to } = req.body;
    // NOTE: In a real production app, we would validate the move legality here 
    // using the same logic as useBackgammon.ts.
    // For this "Max UI" prototype, we trust the client's validation but update the server state.

    // Update Board State Logic (Simplified for prototype)
    const playerSign = game.currentPlayer === 'white' ? 1 : -1;

    // Handle Bar Move
    if (from === -1) {
        if (game.currentPlayer === 'white') game.board.whiteBar--;
        else game.board.blackBar--;
    } else {
        game.board.points[from] -= playerSign; // Remove from source
    }

    // Handle Bear Off
    if (to === 24 || to === -1) { // 24 for white off, -1 for black off (logic varies)
        if (game.currentPlayer === 'white') game.board.whiteOff++;
        else game.board.blackOff++;
    } else {
        // Handle Hit
        if (game.board.points[to] && Math.sign(game.board.points[to]) !== playerSign) {
            // Hit opponent
            if (Math.abs(game.board.points[to]) === 1) {
                if (playerSign === 1) game.board.blackBar++; // White hit Black
                else game.board.whiteBar++; // Black hit White
                game.board.points[to] = playerSign; // Replace
            }
        } else {
            game.board.points[to] += playerSign; // Add to destination
        }
    }

    // Consume die
    game.turnState.movesLeft.pop(); // Simplification: just remove one move

    // Check turn end
    if (game.turnState.movesLeft.length === 0) {
        game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
        game.turnState.hasRolled = false;
        game.dice = [];
    }

    broadcastToGame(req.params.gameId, { type: 'GAME_UPDATE', payload: game });
    res.json(game);
});

// WebSocket handling
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const gameId = url.searchParams.get('gameId');

    if (gameId) {
        if (!connections.has(gameId)) connections.set(gameId, new Set());
        connections.get(gameId).add(ws);

        // Send current state immediately
        const game = games.get(gameId);
        if (game) ws.send(JSON.stringify({ type: 'GAME_UPDATE', payload: game }));

        ws.on('close', () => {
            const gameConns = connections.get(gameId);
            if (gameConns) {
                gameConns.delete(ws);
                if (gameConns.size === 0) connections.delete(gameId);
            }
        });
    }
});

function broadcastToGame(gameId, message) {
    if (connections.has(gameId)) {
        connections.get(gameId).forEach(ws => {
            if (ws.readyState === 1) ws.send(JSON.stringify(message));
        });
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 GuruGammon Backend running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server ready on ws://localhost:${PORT}/ws/game`);
});
