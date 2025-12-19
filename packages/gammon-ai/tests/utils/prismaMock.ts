import { v4 as uuidv4 } from 'uuid';
import { SubscriptionPlan, SubscriptionStatus, GameMode, GameStatus, Player } from '@prisma/client';

type UserRecord = {
  id: string;
  email: string;
  username: string | null;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
  eloRating: number;
  subscriptionType: string;
};

type AnalysisQuotaRecord = {
  id: string;
  userId: string;
  date: Date;
  count: number;
  extraQuota: number;
  initialFree: boolean;
};

type IAQuotaRecord = {
  id: string;
  userId: string;
  dailyQuota: number;
  premiumQuota: number;
  extrasUsed: number;
  resetAt: Date;
};

type QuotaField = 'dailyQuota' | 'premiumQuota' | 'extrasUsed';

type SubscriptionRecord = {
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
};

type UserSessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type GameRecord = {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string | null;
  gameMode: GameMode;
  status: GameStatus;
  stake: number;
  winner: Player | null;
  boardState: any;
  currentPlayer: Player;
  dice: number[];
  cubeLevel: number;
  cubeOwner: Player | null;
  matchLength: number | null;
  whiteScore: number;
  blackScore: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  timeControlPreset: any;
  whiteTimeRemainingMs: number | null;
  blackTimeRemainingMs: number | null;
};

type AnalysisQuotaWhereUnique = {
  userId_date: {
    userId: string;
    date: Date;
  };
};

type IAQuotaWhereUnique = { userId: string };

type AnalysisQuotaOrderBy = {
  date: 'asc' | 'desc';
};

type AnalysisQuotaUpdateInput = Partial<{
  count: { increment?: number; decrement?: number } | number;
  extraQuota: { increment?: number; decrement?: number } | number;
  initialFree: boolean;
}>;

type IAQuotaUpdateInput = Partial<{
  dailyQuota: { increment?: number; decrement?: number } | number;
  premiumQuota: { increment?: number; decrement?: number } | number;
  extrasUsed: { increment?: number; decrement?: number } | number;
  resetAt: Date;
}>;

type AnalysisQuotaCreateInput = {
  id?: string;
  userId: string;
  date: Date;
  count: number;
  extraQuota?: number;
  initialFree?: boolean;
};

type IAQuotaCreateInput = {
  id?: string;
  userId: string;
  dailyQuota?: number;
  premiumQuota?: number;
  extrasUsed?: number;
  resetAt: Date;
};

type SubscriptionWhereUnique = { user_id: string };

type UserWhereUnique = { id?: string; email?: string };

type UserCreateInput = {
  id?: string;
  email: string;
  username?: string | null;
  password?: string | null;
};

type FindOptions<TWhere> = {
  where: TWhere;
  orderBy?: AnalysisQuotaOrderBy;
};

type SelectOption<TRecord> = {
  select?: Partial<Record<keyof TRecord, boolean>>;
};

const users = new Map<string, UserRecord>();
const usersByEmail = new Map<string, string>();
const analysisQuotas = new Map<string, AnalysisQuotaRecord>();
const iaQuotas = new Map<string, IAQuotaRecord>();
const subscriptions = new Map<string, SubscriptionRecord>();
const userSessions = new Map<string, UserSessionRecord>();
const games = new Map<string, GameRecord>();

const cloneUser = (record: UserRecord | null): UserRecord | null => {
  if (!record) {
    return null;
  }
  return {
    ...record,
    createdAt: new Date(record.createdAt.getTime()),
    updatedAt: new Date(record.updatedAt.getTime())
  };
};

const cloneQuota = (record: AnalysisQuotaRecord | null): AnalysisQuotaRecord | null => {
  if (!record) {
    return null;
  }
  return {
    id: record.id,
    userId: record.userId,
    date: new Date(record.date.getTime()),
    count: record.count,
    extraQuota: record.extraQuota,
    initialFree: record.initialFree
  };
};

const keyForQuota = (userId: string, date: Date) => `${userId}::${date.toISOString()}`;

const cloneIAQuota = (record: IAQuotaRecord | null): IAQuotaRecord | null => {
  if (!record) {
    return null;
  }
  return {
    id: record.id,
    userId: record.userId,
    dailyQuota: record.dailyQuota,
    premiumQuota: record.premiumQuota,
    extrasUsed: record.extrasUsed,
    resetAt: new Date(record.resetAt.getTime())
  };
};

const cloneGame = (record: GameRecord | null): GameRecord | null => {
  if (!record) return null;
  return {
    ...record,
    boardState: JSON.parse(JSON.stringify(record.boardState)),
    dice: [...record.dice],
    createdAt: new Date(record.createdAt.getTime()),
    updatedAt: new Date(record.updatedAt.getTime()),
    startedAt: record.startedAt ? new Date(record.startedAt.getTime()) : null,
    finishedAt: record.finishedAt ? new Date(record.finishedAt.getTime()) : null
  };
};

const applyIAQuotaUpdate = (record: IAQuotaRecord, data: IAQuotaUpdateInput) => {
  const applyNumberUpdate = (current: number, update: { increment?: number; decrement?: number } | number | undefined) => {
    if (typeof update === 'undefined') {
      return current;
    }
    if (typeof update === 'number') {
      return update;
    }
    let next = current;
    if (update.increment) {
      next += update.increment;
    }
    if (update.decrement) {
      next -= update.decrement;
    }
    return next;
  };

  record.dailyQuota = applyNumberUpdate(record.dailyQuota, data.dailyQuota);
  record.premiumQuota = applyNumberUpdate(record.premiumQuota, data.premiumQuota);
  record.extrasUsed = applyNumberUpdate(record.extrasUsed, data.extrasUsed);

  if (data.resetAt instanceof Date) {
    record.resetAt = new Date(data.resetAt.getTime());
  }
};

const applyQuotaUpdate = (record: AnalysisQuotaRecord, data: AnalysisQuotaUpdateInput) => {
  if ('count' in data && data.count !== undefined) {
    const value = data.count;
    if (typeof value === 'number') {
      record.count = value;
    } else {
      if (value.increment) {
        record.count += value.increment;
      }
      if (value.decrement) {
        record.count -= value.decrement;
      }
    }
  }

  if ('extraQuota' in data && data.extraQuota !== undefined) {
    const value = data.extraQuota;
    if (typeof value === 'number') {
      record.extraQuota = value;
    } else {
      if (value.increment) {
        record.extraQuota += value.increment;
      }
      if (value.decrement) {
        record.extraQuota -= value.decrement;
      }
    }
  }

  if ('initialFree' in data && typeof data.initialFree === 'boolean') {
    record.initialFree = data.initialFree;
  }
};

const prismaIAQuota = {
  async findUnique({ where }: { where: IAQuotaWhereUnique }) {
    return cloneIAQuota(iaQuotas.get(where.userId) ?? null);
  },

  async upsert({ where, update, create }: { where: IAQuotaWhereUnique; update: IAQuotaUpdateInput; create: IAQuotaCreateInput }) {
    const existing = iaQuotas.get(where.userId);

    if (!existing) {
      const record: IAQuotaRecord = {
        id: create.id ?? uuidv4(),
        userId: create.userId,
        dailyQuota: create.dailyQuota ?? 10,
        premiumQuota: create.premiumQuota ?? 0,
        extrasUsed: create.extrasUsed ?? 0,
        resetAt: new Date(create.resetAt.getTime())
      };

      iaQuotas.set(record.userId, record);
      return cloneIAQuota(record);
    }

    applyIAQuotaUpdate(existing, update);
    iaQuotas.set(existing.userId, existing);
    return cloneIAQuota(existing);
  },

  async update({ where, data }: { where: IAQuotaWhereUnique; data: IAQuotaUpdateInput }) {
    const record = iaQuotas.get(where.userId);
    if (!record) {
      throw new Error(`IAQuota not found for ${where.userId}`);
    }

    applyIAQuotaUpdate(record, data);
    iaQuotas.set(record.userId, record);
    return cloneIAQuota(record);
  },

  async updateMany({
    where,
    data
  }: {
    where: IAQuotaWhereUnique & Partial<{ dailyQuota: { gt: number }; premiumQuota: { gt: number }; extrasUsed: { gt: number } }>;
    data: IAQuotaUpdateInput;
  }) {
    const record = iaQuotas.get(where.userId);
    if (!record) {
      return { count: 0 };
    }

    const target: QuotaField | null = data.premiumQuota
      ? 'premiumQuota'
      : data.dailyQuota
        ? 'dailyQuota'
        : data.extrasUsed
          ? 'extrasUsed'
          : null;

    if (!target) {
      return { count: 0 };
    }

    const threshold = typeof where[target]?.gt === 'number' ? where[target]!.gt : 0;
    if (!(record[target] > threshold)) {
      return { count: 0 };
    }

    applyIAQuotaUpdate(record, data);
    iaQuotas.set(record.userId, record);
    return { count: 1 };
  },

  async create({ data }: { data: IAQuotaCreateInput }) {
    const record: IAQuotaRecord = {
      id: data.id ?? uuidv4(),
      userId: data.userId,
      dailyQuota: data.dailyQuota ?? 10,
      premiumQuota: data.premiumQuota ?? 0,
      extrasUsed: data.extrasUsed ?? 0,
      resetAt: new Date(data.resetAt.getTime())
    };

    iaQuotas.set(record.userId, record);
    return cloneIAQuota(record);
  }
};

const findUser = ({ where, select }: { where: UserWhereUnique } & SelectOption<UserRecord>) => {
  let record: UserRecord | null = null;
  if (where.id && users.has(where.id)) {
    record = users.get(where.id) ?? null;
  } else if (where.email && usersByEmail.has(where.email)) {
    const id = usersByEmail.get(where.email)!;
    record = users.get(id) ?? null;
  }

  if (!record) {
    return null;
  }

  const clone = cloneUser(record);
  if (!clone) {
    return null;
  }

  if (select && Object.keys(select).length > 0) {
    const selectedEntries = Object.entries(select)
      .filter(([, include]) => Boolean(include))
      .map(([key]) => {
        const typedKey = key as keyof UserRecord;
        return [typedKey, clone[typedKey]] as const;
      });

    return Object.fromEntries(selectedEntries) as Partial<UserRecord>;
  }

  return clone;
};

const prismaUsers = {
  async findUnique(options: ({ where: UserWhereUnique } & SelectOption<UserRecord>)) {
    return findUser(options);
  },

  async create({ data }: { data: UserCreateInput }) {
    const id = data.id ?? uuidv4();
    const record: UserRecord = {
      id,
      email: data.email,
      username: data.username ?? null,
      password: data.password ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      eloRating: 1500,
      subscriptionType: 'FREE'
    };

    users.set(id, record);
    usersByEmail.set(data.email, id);

    return cloneUser(record);
  },

  async deleteMany() {
    const count = users.size;
    users.clear();
    usersByEmail.clear();
    return { count };
  }
};

const prismaAnalysisQuota = {
  async findUnique({ where }: { where: AnalysisQuotaWhereUnique }) {
    const { userId, date } = where.userId_date;
    return cloneQuota(analysisQuotas.get(keyForQuota(userId, date)) ?? null);
  },

  async findFirst(options: FindOptions<{ userId: string }>) {
    const { userId } = options.where;
    const records = Array.from(analysisQuotas.values()).filter(record => record.userId === userId);

    if (records.length === 0) {
      return null;
    }

    const order = options.orderBy?.date ?? 'asc';
    records.sort((a, b) => {
      const difference = a.date.getTime() - b.date.getTime();
      return order === 'asc' ? difference : -difference;
    });

    return cloneQuota(records[0]);
  },

  async create({ data }: { data: AnalysisQuotaCreateInput }) {
    const id = data.id ?? uuidv4();
    const record: AnalysisQuotaRecord = {
      id,
      userId: data.userId,
      date: new Date(data.date.getTime()),
      count: data.count,
      extraQuota: data.extraQuota ?? 0,
      initialFree: data.initialFree ?? true
    };

    analysisQuotas.set(keyForQuota(record.userId, record.date), record);
    return cloneQuota(record);
  },

  async update({ where, data }: { where: AnalysisQuotaWhereUnique; data: AnalysisQuotaUpdateInput }) {
    const { userId, date } = where.userId_date;
    const key = keyForQuota(userId, date);
    const record = analysisQuotas.get(key);

    if (!record) {
      throw new Error(`AnalysisQuota not found for ${userId} ${date.toISOString()}`);
    }

    applyQuotaUpdate(record, data);
    record.date = new Date(date.getTime());
    analysisQuotas.set(key, record);

    return cloneQuota(record);
  }
};

const prismaSubscriptions = {
  async findUnique({ where }: { where: SubscriptionWhereUnique }) {
    const record = subscriptions.get(where.user_id) ?? null;
    if (!record) {
      return null;
    }

    return {
      user_id: record.user_id,
      plan: record.plan,
      status: record.status,
      createdAt: new Date(),
      updatedAt: new Date(),
      id: uuidv4()
    };
  }
};

const prismaUserSession = {
  async create({ data }: { data: { userId: string; tokenHash: string; expiresAt: Date; jti: string } }) {
    const record: UserSessionRecord = {
      id: uuidv4(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: new Date(data.expiresAt.getTime()),
      jti: data.jti,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    userSessions.set(`${data.userId}:${data.jti}`, record);
    return { ...record };
  },

  async delete({ where }: { where: { userId: string; jti?: string } }) {
    const key = where.jti ? `${where.userId}:${where.jti}` : null;
    if (key) {
      const existing = userSessions.get(key);
      if (!existing) {
        throw new Error('Session not found');
      }
      userSessions.delete(key);
      return existing;
    }

    let removed: UserSessionRecord | undefined;
    for (const sessionKey of Array.from(userSessions.keys())) {
      if (sessionKey.startsWith(`${where.userId}:`)) {
        removed = userSessions.get(sessionKey);
        userSessions.delete(sessionKey);
      }
    }

    if (!removed) {
      throw new Error('Session not found');
    }
    return removed;
  },

  async deleteMany({ where }: { where: { userId: string; jti?: string; NOT?: { jti: string } } }) {
    let count = 0;
    for (const sessionKey of Array.from(userSessions.keys())) {
      if (!sessionKey.startsWith(`${where.userId}:`)) {
        continue;
      }

      const [, sessionJti] = sessionKey.split(':');
      if (where.jti && sessionJti !== where.jti) {
        continue;
      }

      if (where.NOT?.jti && sessionJti === where.NOT.jti) {
        continue;
      }

      userSessions.delete(sessionKey);
      count += 1;
    }

    return { count };
  },

  async findFirst({ where }: { where: { userId: string; jti: string } }) {
    const key = `${where.userId}:${where.jti}`;
    const record = userSessions.get(key);
    if (!record) {
      return null;
    }
    return { ...record };
  }
};

const prismaGames = {
  async create({ data }: { data: any }) {
    const id = data.id ?? uuidv4();
    const record: GameRecord = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: data.startedAt ?? null,
      finishedAt: null,
      whiteScore: 0,
      blackScore: 0,
      winner: null,
      cubeLevel: 1,
      cubeOwner: null,
      cubeHistory: [],
      matchLength: data.matchLength ?? null,
      timeControlPreset: data.timeControlPreset ?? null,
      whiteTimeRemainingMs: data.whiteTimeRemainingMs ?? null,
      blackTimeRemainingMs: data.blackTimeRemainingMs ?? null
    };
    games.set(id, record);
    return cloneGame(record);
  },
  async findUnique({ where, include }: { where: { id: string }, include?: any }) {
    const record = games.get(where.id) ?? null;
    if (!record) return null;
    const result: any = cloneGame(record);

    if (include?.whitePlayer) {
      result.whitePlayer = await prismaUsers.findUnique({ where: { id: record.whitePlayerId } });
    }
    if (include?.blackPlayer && record.blackPlayerId) {
      result.blackPlayer = await prismaUsers.findUnique({ where: { id: record.blackPlayerId } });
    }
    return result;
  },
  async update({ where, data }: { where: { id: string }, data: any }) {
    const record = games.get(where.id);
    if (!record) throw new Error('Game not found');

    // Simple shallow merge
    Object.assign(record, data);
    record.updatedAt = new Date();
    games.set(where.id, record);
    return cloneGame(record);
  }
};

type PrismaMock = {
  users: typeof prismaUsers;
  analysisQuota: typeof prismaAnalysisQuota;
  iaQuota: typeof prismaIAQuota;
  iAQuota: typeof prismaIAQuota;
  subscriptions: typeof prismaSubscriptions;
  userSession: typeof prismaUserSession;
  games: typeof prismaGames;
  $transaction: <T>(
    arg1: ((client: PrismaMock) => Promise<T> | T) | Array<() => Promise<unknown> | unknown>,
    options?: unknown
  ) => Promise<T | T[]>;
};

export const prisma: PrismaMock = {
  users: prismaUsers,
  analysisQuota: prismaAnalysisQuota,
  iaQuota: prismaIAQuota,
  iAQuota: prismaIAQuota,
  subscriptions: prismaSubscriptions,
  userSession: prismaUserSession,
  games: prismaGames,
  async $transaction<T>(
    arg1: ((client: PrismaMock) => Promise<T> | T) | Array<() => Promise<unknown> | unknown>,
    _options?: unknown
  ): Promise<T | T[]> {
    if (Array.isArray(arg1)) {
      const results: T[] = [];
      for (const op of arg1) {
        const value = await op();
        results.push(value as T);
      }
      return results;
    }

    return arg1(prisma);
  }
};

export const resetDatabase = () => {
  users.clear();
  usersByEmail.clear();
  analysisQuotas.clear();
  iaQuotas.clear();
  subscriptions.clear();
  userSessions.clear();
  games.clear();
};

export const seedUser = (data: UserCreateInput & { password: string }) => {
  const id = data.id ?? uuidv4();
  const record: UserRecord = {
    id,
    email: data.email,
    username: data.username ?? null,
    password: data.password,
    createdAt: new Date(),
    updatedAt: new Date(),
    eloRating: 1500,
    subscriptionType: 'FREE'
  };

  users.set(id, record);
  usersByEmail.set(data.email, id);
  return cloneUser(record);
};

export const seedSubscription = (data: SubscriptionRecord) => {
  subscriptions.set(data.user_id, { ...data });
};

export const seedAnalysisQuota = (data: AnalysisQuotaCreateInput) => {
  const record: AnalysisQuotaRecord = {
    id: data.id ?? uuidv4(),
    userId: data.userId,
    date: new Date(data.date.getTime()),
    count: data.count,
    extraQuota: data.extraQuota ?? 0,
    initialFree: data.initialFree ?? true
  };

  analysisQuotas.set(keyForQuota(record.userId, record.date), record);
  return cloneQuota(record);
};

export const getAnalysisQuota = (userId: string, date: Date) => {
  return cloneQuota(analysisQuotas.get(keyForQuota(userId, date)) ?? null);
};

export const listAnalysisQuotas = () => {
  return Array.from(analysisQuotas.values()).map(record => cloneQuota(record));
};

export const seedIAQuota = (data: IAQuotaCreateInput) => {
  const record: IAQuotaRecord = {
    id: data.id ?? uuidv4(),
    userId: data.userId,
    dailyQuota: data.dailyQuota ?? 10,
    premiumQuota: data.premiumQuota ?? 0,
    extrasUsed: data.extrasUsed ?? 0,
    resetAt: new Date(data.resetAt.getTime())
  };

  iaQuotas.set(record.userId, record);
  return cloneIAQuota(record);
};

export const getIAQuota = (userId: string) => cloneIAQuota(iaQuotas.get(userId) ?? null);

export const listUsers = () => {
  return Array.from(users.values()).map(record => cloneUser(record));
};
