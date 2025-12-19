import { PrismaClient } from '@prisma/client';
import { config } from '../config';

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

export const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});
