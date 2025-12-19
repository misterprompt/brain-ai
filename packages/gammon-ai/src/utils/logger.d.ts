export declare class Logger {
    private readonly context;
    constructor(context: string);
    info(message: string, data?: unknown): void;
    error(message: string, error?: unknown): void;
    warn(message: string, data?: unknown): void;
    debug(message: string, data?: unknown): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map