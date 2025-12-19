import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// In-memory store for mock data
const mockStore = {
    users: new Map<string, any>(),
    games: new Map<string, any>(),
    tournaments: new Map<string, any>(),
};

export const createPrismaMock = (): PrismaClient => {
    logger.warn('⚠️  RUNNING IN MOCK DB MODE - No real database connection');

    const mockHandler = {
        get: (target: any, prop: string) => {
            if (prop === '$connect') return async () => { };
            if (prop === '$disconnect') return async () => { };
            if (prop === '$queryRaw') return async () => [1];

            // Handle nested model access (e.g., prisma.user.create)
            if (prop === 'user') {
                return {
                    findUnique: async ({ where }: any) => {
                        const user = Array.from(mockStore.users.values()).find(
                            u => u.id === where.id || u.email === where.email || u.username === where.username
                        );
                        return user || null;
                    },
                    findFirst: async ({ where }: any) => {
                        const user = Array.from(mockStore.users.values()).find(
                            u => (where.email && u.email === where.email) ||
                                (where.username && u.username === where.username)
                        );
                        return user || null;
                    },
                    findMany: async () => Array.from(mockStore.users.values()),
                    create: async ({ data }: any) => {
                        const id = `user-${Date.now()}-${Math.random()}`;
                        const user = {
                            id,
                            ...data,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            role: data.role || 'USER',
                            subscriptionType: data.subscriptionType || 'FREE'
                        };
                        mockStore.users.set(id, user);
                        logger.info(`Mock DB: Created user ${user.username} (${user.email})`);
                        return user;
                    },
                    update: async ({ where, data }: any) => {
                        const user = Array.from(mockStore.users.values()).find(
                            u => u.id === where.id || u.email === where.email
                        );
                        if (user) {
                            Object.assign(user, data, { updatedAt: new Date() });
                            return user;
                        }
                        return null;
                    },
                    count: async () => mockStore.users.size,
                };
            }

            // Return a generic mock function for other models
            return async (...args: any[]) => {
                logger.debug(`Mock DB call: ${prop}`, args);
                if (prop === 'count') return 0;
                if (prop === 'findUnique') return null;
                if (prop === 'findFirst') return null;
                if (prop === 'findMany') return [];
                if (prop === 'create') return { id: 'mock-id', ...args[0]?.data };
                if (prop === 'update') return { id: 'mock-id', ...args[0]?.data };
                if (prop === 'upsert') return { id: 'mock-id', ...args[0]?.create };
                return null;
            };
        }
    };

    return new Proxy({}, mockHandler) as unknown as PrismaClient;
};
