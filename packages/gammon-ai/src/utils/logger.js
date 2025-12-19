"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
// src/utils/logger.ts
class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    info(message, data) {
        const payload = data ?? '';
        console.log(`[${new Date().toISOString()}] [${this.context}] INFO: ${message}`, payload);
    }
    error(message, error) {
        const payload = error instanceof Error ? error : error ?? '';
        console.error(`[${new Date().toISOString()}] [${this.context}] ERROR: ${message}`, payload);
    }
    warn(message, data) {
        const payload = data ?? '';
        console.warn(`[${new Date().toISOString()}] [${this.context}] WARN: ${message}`, payload);
    }
    debug(message, data) {
        if (process.env.NODE_ENV !== 'production') {
            const payload = data ?? '';
            console.debug(`[${new Date().toISOString()}] [${this.context}] DEBUG: ${message}`, payload);
        }
    }
}
exports.Logger = Logger;
// Export par défaut
exports.logger = new Logger('GammonGuru');
//# sourceMappingURL=logger.js.map