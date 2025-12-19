"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Simple server script to bypass ESM issues
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_js_1 = require("./config.js");
const app = (0, express_1.default)();
// Basic middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)({
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
const PORT = config_js_1.config.port || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Simple server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   API: http://localhost:${PORT}/api`);
});
//# sourceMappingURL=simple-test-server.js.map