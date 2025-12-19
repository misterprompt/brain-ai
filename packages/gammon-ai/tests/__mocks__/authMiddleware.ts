type TestUser = { id: string };

let currentUser: TestUser | null = { id: 'user-123' };

export const setTestUser = (user: TestUser | string | null) => {
  if (user === null) {
    currentUser = null;
    return;
  }

  currentUser = typeof user === 'string' ? { id: user } : user;
};

export const authMiddleware = (req: any, res: any, next: () => void) => {
  if (!currentUser || !currentUser.id) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
    return;
  }

  req.user = currentUser;
  next();
};
