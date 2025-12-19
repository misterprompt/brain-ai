// src/utils/logger.ts
export class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: unknown) {
    const payload = data ?? '';
    console.log(`[${new Date().toISOString()}] [${this.context}] INFO: ${message}`, payload);
  }

  error(message: string, error?: unknown) {
    const payload = error instanceof Error ? error : error ?? '';
    console.error(`[${new Date().toISOString()}] [${this.context}] ERROR: ${message}`, payload);
  }

  warn(message: string, data?: unknown) {
    const payload = data ?? '';
    console.warn(`[${new Date().toISOString()}] [${this.context}] WARN: ${message}`, payload);
  }

  debug(message: string, data?: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      const payload = data ?? '';
      console.debug(`[${new Date().toISOString()}] [${this.context}] DEBUG: ${message}`, payload);
    }
  }
}

// Export par défaut
export const logger = new Logger('GammonGuru');
