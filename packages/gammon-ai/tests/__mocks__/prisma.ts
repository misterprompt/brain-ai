const prisma = {
  games: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn()
  },
  users: {
    findUnique: jest.fn()
  }
};

export const resetPrismaMock = () => {
  prisma.games.create.mockReset();
  prisma.games.update.mockReset();
  prisma.games.findUnique.mockReset();
  prisma.users.findUnique.mockReset();
};

export default prisma;
