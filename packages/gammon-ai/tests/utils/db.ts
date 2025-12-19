import { resetDatabase } from './prismaMock';

export { prisma, resetDatabase, seedUser, seedSubscription, seedAnalysisQuota, seedIAQuota } from './prismaMock';

export const setupTestDatabase = () => {
  beforeEach(async () => {
    resetDatabase();
  });

  afterAll(async () => {
    resetDatabase();
  });
};
