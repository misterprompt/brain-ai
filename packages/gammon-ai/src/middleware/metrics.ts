import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDurationSeconds } from '../metrics/httpMetrics';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const routePath = (() => {
            if (typeof req.route?.path === 'string') {
                const normalizedPath = req.route.path === '/' ? '' : req.route.path;
                return `${req.baseUrl ?? ''}${normalizedPath}` || req.originalUrl?.split('?')[0] || req.path || 'unknown';
            }

            if (req.baseUrl) {
                return req.baseUrl;
            }

            return req.originalUrl?.split('?')[0] || req.path || 'unknown';
        })();

        const labels = [req.method, routePath, String(res.statusCode)] as const;

        httpRequestsTotal.labels(...labels).inc();

        const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
        httpRequestDurationSeconds.labels(...labels).observe(durationSeconds);
    });

    next();
};
