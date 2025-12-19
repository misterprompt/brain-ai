// src/simple-test-server.ts
// FIXED: Changed import from './config.js' to './config'
import express from 'express';
import cors from 'cors';
import { config } from './config';

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
}));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
    res.json({ message: 'GuruGammon API - Simple Mode' });
});

const PORT = config.port || 3000;

app.listen(PORT, () => {
    console.log(`\n🚀 Simple server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   API: http://localhost:${PORT}/api`);
});
