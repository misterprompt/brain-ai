"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const config_1 = require("../config");
const shouldConstructDatabaseUrl = (!process.env.DATABASE_URL || process.env.DATABASE_URL === '') && process.env.PGHOST;
if (shouldConstructDatabaseUrl) {
    const host = process.env.PGHOST;
    const user = process.env.PGUSER;
    const password = process.env.PGPASSWORD;
    const database = process.env.PGDATABASE;
    const port = process.env.PGPORT;
    if (host && user && password && database && port) {
        const encodedPassword = encodeURIComponent(password);
        process.env.DATABASE_URL = `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}?schema=public`;
    }
}
exports.prisma = new client_1.PrismaClient({
    log: config_1.config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});
//# sourceMappingURL=prisma.js.map