"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ddosProtection = void 0;
const logger_1 = require("../utils/logger");
const ddosProtection = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    const suspiciousPatterns = [
        /curl|wget|python/i,
        /sqlmap|nikto|dirbuster/i,
        /bot|crawler|spider/i,
        /masscan|nmap/i
    ];
    // Check for suspicious user agents
    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
        logger_1.logger.warn(`🚨 Suspicious request blocked: ${clientIP} - ${userAgent}`);
        return res.status(403).json({
            error: 'Access denied',
            message: 'Suspicious activity detected'
        });
    }
    // Check for rapid repeated requests (additional layer beyond rate limiting)
    next();
};
exports.ddosProtection = ddosProtection;
//# sourceMappingURL=ddos.js.map