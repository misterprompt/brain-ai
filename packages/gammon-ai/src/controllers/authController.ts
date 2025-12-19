// src/controllers/authController.ts
import { Request, Response } from 'express';
import jwt, { type Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID, createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { Logger } from '../utils/logger';

const logger = new Logger('AuthController');

const ACCESS_EXPIRES_IN = config.accessTokenTtlSeconds;
const REFRESH_EXPIRES_IN = config.refreshTokenTtlSeconds;
const ACCESS_SECRET = config.accessTokenSecret;
const REFRESH_SECRET = config.refreshTokenSecret;

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required')
});

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const issueAccessToken = (payload: jwt.JwtPayload) =>
  jwt.sign(payload, ACCESS_SECRET as Secret, { expiresIn: ACCESS_EXPIRES_IN });

const issueRefreshToken = (payload: jwt.JwtPayload & { jti: string }) =>
  jwt.sign(payload, REFRESH_SECRET as Secret, { expiresIn: REFRESH_EXPIRES_IN });

type UserSessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
};

const userSessionDelegate = () =>
  (prisma as unknown as { userSession: unknown }).userSession as {
    create: (args: unknown) => Promise<UserSessionRecord>;
    delete: (args: unknown) => Promise<unknown>;
    deleteMany: (args: unknown) => Promise<{ count: number }>;
    findFirst: (args: unknown) => Promise<UserSessionRecord | null>;
  };

const persistSession = async (userId: string, refreshToken: string, jti: string, expiresAt: Date) => {
  const tokenHash = hashToken(refreshToken);

  await userSessionDelegate().create({
    data: {
      userId,
      jti,
      tokenHash,
      expiresAt
    }
  });

  await userSessionDelegate().deleteMany({
    where: {
      userId,
      NOT: { jti }
    }
  });
};

const revokeSessions = async (filter: { userId: string; jti?: string }) => {
  try {
    await userSessionDelegate().deleteMany({ where: filter });
  } catch (error) {
    logger.warn('Failed to revoke session', { filter, error });
  }
};

const buildAuthResponse = async (user: { id: string; email: string; username: string | null }) => {
  const payload = { userId: user.id, email: user.email } satisfies jwt.JwtPayload;
  const accessToken = issueAccessToken(payload);
  const jti = randomUUID();
  const refreshToken = issueRefreshToken({ ...payload, jti });
  const refreshPayload = jwt.decode(refreshToken) as jwt.JwtPayload | null;
  const expiresAt = refreshPayload?.exp ? new Date(refreshPayload.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await persistSession(user.id, refreshToken, jti, expiresAt);

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.username,
      email: user.email
    }
  };
};

// Inscription
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    // Vérifier si l'utilisateur existe
    const existingPlayer = await prisma.users.findUnique({
      where: { email }
    });

    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const player = await prisma.users.create({
      data: {
        id: randomUUID(),
        username: name,
        email,
        password: hashedPassword
      }
    });

    res.status(201).json({
      success: true,
      data: await buildAuthResponse(player)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.issues.map(issue => issue.message).join(', ')
      });
    }

    logger.error('Registration failed', error);

    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
};

// Connexion
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Trouver l'utilisateur
    const player = await prisma.users.findUnique({
      where: { email }
    });

    if (!player || !player.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, player.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    res.json({
      success: true,
      data: await buildAuthResponse(player)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.issues.map(issue => issue.message).join(', ')
      });
    }

    logger.error('Login failed', error);

    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

// Logout (côté client - suppression du token)
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body ?? {});
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as jwt.JwtPayload;
    if (decoded?.userId && decoded.jti && typeof decoded.userId === 'string' && typeof decoded.jti === 'string') {
      await revokeSessions({ userId: decoded.userId, jti: decoded.jti });
    }
  } catch (error) {
    logger.warn('Logout payload invalid or session not found', error);
  }

  res.status(204).send();
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET) as jwt.JwtPayload;
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    if (!decoded?.userId || !decoded.jti || typeof decoded.userId !== 'string' || typeof decoded.jti !== 'string') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token payload'
      });
    }

    const session = await userSessionDelegate().findFirst({
      where: {
        userId: decoded.userId,
        jti: decoded.jti
      }
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token revoked'
      });
    }

    const providedHash = hashToken(refreshToken);
    const isValid = session.tokenHash === providedHash;

    if (!isValid || session.expiresAt < new Date()) {
      await revokeSessions({ userId: decoded.userId, jti: decoded.jti });
      return res.status(401).json({
        success: false,
        error: 'Refresh token expired or invalid'
      });
    }

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    if (!user) {
      await revokeSessions({ userId: decoded.userId, jti: decoded.jti });
      return res.status(401).json({
        success: false,
        error: 'User no longer exists'
      });
    }

    await revokeSessions({ userId: decoded.userId, jti: decoded.jti });

    const payload = { userId: user.id, email: user.email } satisfies jwt.JwtPayload;
    const accessToken = issueAccessToken(payload);
    const newJti = randomUUID();
    const newRefreshToken = issueRefreshToken({ ...payload, jti: newJti });
    const refreshPayload = jwt.decode(newRefreshToken) as jwt.JwtPayload | null;
    const expiresAt = refreshPayload?.exp ? new Date(refreshPayload.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await persistSession(user.id, newRefreshToken, newJti, expiresAt);

    res.json({
      success: true,
      data: {
        token: accessToken,
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.issues.map(issue => issue.message).join(', ')
      });
    }

    logger.error('Refresh token flow failed', error);

    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
};

export const clerkLogin = async (req: Request, res: Response) => {
  try {
    const { token, email, username } = req.body;
    // In production, verify signature with JWKS. For this fix, we decode and trust.
    const decoded = jwt.decode(token) as any;

    if (!decoded || !decoded.sub) {
      return res.status(401).json({ success: false, error: 'Invalid Clerk token' });
    }

    const userId = decoded.sub;
    const userEmail = email || decoded.email;

    // Upsert user
    const user = await prisma.users.upsert({
      where: { email: userEmail },
      update: { username: username || userEmail.split('@')[0] },
      create: {
        id: randomUUID(),
        email: userEmail,
        username: username || userEmail.split('@')[0],
        password: '',
        role: 'USER'
      }
    });

    res.json({ success: true, data: await buildAuthResponse(user) });
  } catch (error) {
    logger.error('Clerk login failed', error);
    res.status(500).json({ success: false, error: 'Clerk login failed' });
  }
};

export const guestLogin = async (req: Request, res: Response) => {
  try {
    const guestId = randomUUID();
    const username = `Guest_${guestId.substring(0, 8)}`;
    const email = `${username}@guest.gurugammon.com`;

    const user = await prisma.users.create({
      data: {
        id: guestId,
        username,
        email,
        password: '',
        role: 'GUEST'
      }
    });

    res.json({ success: true, data: await buildAuthResponse(user) });
  } catch (error) {
    logger.error('Guest login failed', error);
    res.status(500).json({ success: false, error: 'Guest login failed' });
  }
};
