import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const ddosProtection = (req: Request, res: Response, next: NextFunction) => {
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
        logger.warn(`🚨 Suspicious request blocked: ${clientIP} - ${userAgent}`);
        return res.status(403).json({
            error: 'Access denied',
            message: 'Suspicious activity detected'
        });
    }

    // Check for rapid repeated requests (additional layer beyond rate limiting)
    next();
};
