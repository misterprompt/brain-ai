// Type declarations for custom modules
import type { Server } from 'http';

declare module 'express-slow-down' {
  import { RequestHandler } from 'express';
  interface Options {
    windowMs?: number;
    delayAfter?: number;
    delayMs?: number;
    maxDelayMs?: number;
    skip?: (req: any, res: any) => boolean;
    onLimitReached?: (req: any, res: any, options: any) => void;
  }
  function slowDown(options: Options): RequestHandler;
  export = slowDown;
}

declare module 'express-rate-limit' {
  import { RequestHandler } from 'express';
  interface Options {
    windowMs?: number;
    max?: number;
    message?: string | object;
    statusCode?: number;
    headers?: boolean;
    draft_polli_ratelimit_headers?: boolean;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    skip?: (req: any, res: any) => boolean;
    handler?: (req: any, res: any, next: any) => void;
  }
  function rateLimit(options?: Options): RequestHandler;
  export default rateLimit;
}

declare module './cache-service' {
  export type CacheKeyGenerator = (...args: unknown[]) => string;

  export interface CacheKeys {
    user: CacheKeyGenerator;
    game: CacheKeyGenerator;
    analysis: CacheKeyGenerator;
    leaderboard: CacheKeyGenerator;
    stats: CacheKeyGenerator;
    image: CacheKeyGenerator;
  }

  export interface CacheService {
    get<T>(key: string, region?: string): Promise<T | null>;
    set<T>(key: string, data: T, ttl?: number, region?: string): Promise<void>;
    generateKey(endpoint: string, params?: Record<string, unknown>, region?: string): string;
    stats(): Promise<Record<string, unknown>>;
    optimizeForRegion(region: string): Promise<number>;
    clearRegion(region: string): Promise<void>;
    del(key: string): Promise<void>;
    clear(): Promise<void>;
  }

  export const cacheService: CacheService;
  export const CACHE_KEYS: CacheKeys;
  export const CACHE_TTL: CacheTTL;
  export const performanceMetrics: Record<string, unknown>;
}

declare module './language-manager' {
  export interface LanguageInfo {
    name: string;
    flag: string;
  }

  export interface TranslatedContent {
    title: string;
    content: string;
    difficulty: string;
    estimatedTime: string;
  }

  export class LanguageManager {
    detectLanguage(req: { headers?: Record<string, unknown> }): string;
    getTranslatedContent(key: string, language: string): TranslatedContent | undefined;
    getSupportedLanguages(): Record<string, LanguageInfo>;
    setUserLanguage(userId: string, language: string): Promise<string>;
    getUserLanguage(userId: string): Promise<string | null>;
  }
  export const SUPPORTED_LANGUAGES: Record<string, LanguageInfo>;
  export const TRANSLATED_RULES: Record<string, Record<string, TranslatedContent>>;
  export const REGION_LANGUAGE_MAP: Record<string, string>;
}

declare module './websocket-server' {
  export interface WebSocketStats {
    activeConnections: number;
    activeGames: number;
    waitingPlayers: number;
  }

  export interface GameStateSummary {
    id: string;
    status: string;
    currentPlayer: string;
  }

  export class WebSocketServer {
    constructor(server: Server);
    init(): void;
    getStats(): WebSocketStats;
  }

  export function initWebSocketServer(server: Server): void;
  export function getWebSocketStats(): WebSocketStats;
}
