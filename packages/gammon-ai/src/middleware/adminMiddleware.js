"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminFed = void 0;
const errors_1 = require("../utils/errors");
const requireAdminFed = (req, res, next) => {
    if (!req.user) {
        return next(new errors_1.AppError('Authentication required', 401));
    }
    if (req.user.role !== 'ADMIN_FED' && req.user.role !== 'ADMIN') {
        return next(new errors_1.AppError('Access denied: Federation Admin required', 403));
    }
    next();
};
exports.requireAdminFed = requireAdminFed;
//# sourceMappingURL=adminMiddleware.js.map