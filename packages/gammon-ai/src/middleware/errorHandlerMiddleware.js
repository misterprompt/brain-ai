"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandlerMiddleware = errorHandlerMiddleware;
const logger_1 = require("../utils/logger");
function errorHandlerMiddleware(error, req, res, _next) {
    const err = (error ?? {});
    const message = err.message ?? 'Internal Server Error';
    const status = err.status ?? 500;
    logger_1.logger.error(`🚨 ${message}`, error);
    logger_1.logger.info('Error details', {
        url: req.originalUrl,
        method: req.method,
        stack: err.stack
    });
    res.status(status).json({
        error: {
            message,
            code: err.code ?? 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString()
        }
    });
}
//# sourceMappingURL=errorHandlerMiddleware.js.map