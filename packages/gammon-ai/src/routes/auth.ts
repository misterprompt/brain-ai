import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';

const router = express.Router();

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: `${process.env.BACKEND_URL || 'https://gurugammon.onrender.com'}/api/auth/google/callback`
},
    async (_accessToken, _refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email from Google'));

            const user = await prisma.users.upsert({
                where: { email },
                update: { username: profile.displayName || email.split('@')[0] },
                create: {
                    id: randomUUID(),
                    email,
                    username: profile.displayName || email.split('@')[0],
                    password: '',
                    role: 'USER'
                }
            });

            return done(null, user);
        } catch (error) {
            return done(error as Error);
        }
    }
));

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.users.findUnique({ where: { id } });
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'https://gurugammon-react.netlify.app'}/login` }),
    (req, res) => {
        const user = req.user as any;
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            config.accessTokenSecret,
            { expiresIn: config.accessTokenTtlSeconds }
        );
        res.redirect(`${process.env.FRONTEND_URL || 'https://gurugammon-react.netlify.app'}/auth/callback?token=${token}`);
    }
);

// Guest login
router.post('/guest', async (req, res) => {
    try {
        const guestId = randomUUID();
        const username = `Guest_${guestId.substring(0, 8)}`;
        const email = `${username}@guest.gurugammon.com`;

        const user = await prisma.users.create({
            data: {
                id: guestId,
                username,
                email,
                password: '',
                role: 'GUEST'
            }
        });

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            config.accessTokenSecret,
            { expiresIn: config.accessTokenTtlSeconds }
        );

        res.json({ success: true, data: { token, user: { id: user.id, username: user.username, email: user.email } } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Guest login failed' });
    }
});

export default router;
