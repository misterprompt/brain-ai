import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError } from '../utils/errors';
import { UserRole } from '@prisma/client';

export class AdminController {
    static async getTournaments(req: AuthRequest, res: Response) {
        const userId = req.user?.id;
        if (!userId) throw new AppError('Unauthorized', 401);

        const user = await prisma.users.findUnique({ where: { id: userId } });
        if (!user || (user.role !== 'ADMIN' && user.role !== 'ADMIN_FED')) {
            throw new AppError('Forbidden', 403);
        }

        const tournaments = await prisma.tournaments.findMany({
            include: {
                participants: true,
                creator: {
                    select: { username: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: tournaments });
    }

    static async createInviteLink(req: AuthRequest, res: Response) {
        const userId = req.user?.id;
        if (!userId) throw new AppError('Unauthorized', 401);

        const user = await prisma.users.findUnique({ where: { id: userId } });
        if (!user || (user.role !== 'ADMIN' && user.role !== 'ADMIN_FED')) {
            throw new AppError('Forbidden', 403);
        }

        const { role = 'USER', expiresInDays = 7 } = req.body;

        // Only ADMIN can invite other ADMINs or ADMIN_FEDs?
        // Let's say ADMIN_FED can only invite USERs or other ADMIN_FEDs?
        // For simplicity, allow them to create invites for specified role, maybe restricted.
        if (role === 'ADMIN' && user.role !== 'ADMIN') {
            throw new AppError('Forbidden: Cannot invite ADMINs', 403);
        }

        const code = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const invite = await prisma.invite_codes.create({
            data: {
                code,
                createdBy: userId,
                role: role as UserRole,
                expiresAt
            }
        });

        res.json({ success: true, data: { inviteLink: `/register?code=${code}`, code, expiresAt } });
    }
}
