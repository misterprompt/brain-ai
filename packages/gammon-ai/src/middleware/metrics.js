"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsMiddleware = void 0;
const httpMetrics_1 = require("../metrics/httpMetrics");
const metricsMiddleware = (req, res, next) => {
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
        const labels = [req.method, routePath, String(res.statusCode)];
        httpMetrics_1.httpRequestsTotal.labels(...labels).inc();
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
        httpMetrics_1.httpRequestDurationSeconds.labels(...labels).observe(durationSeconds);
    });
    next();
};
exports.metricsMiddleware = metricsMiddleware;
//# sourceMappingURL=metrics.js.map