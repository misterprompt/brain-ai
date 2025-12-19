// src/controllers/coachController.ts
// FIXED: Added null check for id parameter
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { GameService } from '../services/gameService';
import { AppError } from '../utils/errors';
import { coachCallsTotal } from '../metrics/registry';

export class CoachController {
    static async getCoachAdvice(req: Request, res: Response) {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        if (!userId) throw new AppError('Unauthorized', 401);
        if (!id) throw new AppError('Game ID required', 400);

        const game = await GameService.getGame(id);
        if (!game) throw new AppError('Game not found', 404);

        // Check quota: unlimited for first 6 months
        const user = await prisma.users.findUnique({ where: { id: userId } });
        if (!user) throw new AppError('User not found', 404);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        if (user.createdAt < sixMonthsAgo && user.subscriptionType === 'FREE') {
            throw new AppError('Coach trial expired. Please upgrade to Premium.', 403);
        }

        // Detect language (simple header check or default to English)
        const langHeader = req.headers['accept-language'] || '';
        const language = langHeader.includes('fr') ? 'fr' : 'en';

        // Mock DeepSeek R1 Call
        const advice = await mockDeepSeekR1(game.board, language);

        // Increment metrics
        coachCallsTotal.inc();

        res.json({ advice });
    }
}

async function mockDeepSeekR1(board: any, language: 'fr' | 'en'): Promise<string> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));

    if (language === 'fr') {
        return "C'est une position intéressante. Vous devriez considérer de construire votre prime...";
    }
    return "This is an interesting position. You should consider building your prime...";
}
