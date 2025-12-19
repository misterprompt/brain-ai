// src/middleware/securityMiddleware.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// Configuration CORS
const ALLOWED_DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const resolveCorsOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN;
    return frontendUrl ? [frontendUrl] : [];
  }

  const base = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
  return [base, ...ALLOWED_DEV_ORIGINS];
};

const corsOptions = {
  origin: resolveCorsOrigins(),
  credentials: true, // Permettre les cookies/headers d'auth
  optionsSuccessStatus: 200
};

// Rate limiting général
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Rate limiting strict pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limite à 5 tentatives de connexion par IP
  message: {
    success: false,
    error: 'Too many login attempts, please try again later.'
  },
  skipSuccessfulRequests: true, // Ne pas compter les connexions réussies
});

// Middleware de validation d'input générique
export const validateInput = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validation basique des types
    for (const field of requiredFields) {
      const value = req.body[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: `Field ${field} must be a non-empty string`
        });
      }
    }

    next();
  };
};

// Export tous les middlewares de sécurité
export {
  helmet,
  cors,
  corsOptions,
  generalLimiter,
  authLimiter
};
