import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const requireAdminFed = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return next(new AppError('Authentication required', 401));
    }

    if (req.user.role !== 'ADMIN_FED' && req.user.role !== 'ADMIN') {
        return next(new AppError('Access denied: Federation Admin required', 403));
    }

    next();
};
