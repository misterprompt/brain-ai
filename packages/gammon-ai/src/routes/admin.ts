// src/routes/admin.ts
// FIXED: Already using Router() correctly
import { Router } from 'express';
import * as express from 'express';
import { AdminController } from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware as unknown as express.RequestHandler);

router.get('/tournaments', AdminController.getTournaments as unknown as express.RequestHandler);
router.post('/invites', AdminController.createInviteLink as unknown as express.RequestHandler);

export default router;
