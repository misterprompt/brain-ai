import { QuotaExceededError } from '../src/services/aiService';
import { evaluatePosition, getHint } from '../src/services/gnubgService';
import type { SuggestedMove } from '../src/types/ai';
import { getIAQuota, resetDatabase, seedIAQuota } from './utils/prismaMock';

type NotificationServiceMock = {
  notifyQuotaReset: jest.Mock;
  notifyQuotaExhausted: jest.Mock;
  notifyInvitation: jest.Mock;
  notifyVictory: jest.Mock;
};

jest.mock('../src/services/notificationService', () => {
  const notificationService: NotificationServiceMock = {
    notifyQuotaReset: jest.fn(),
    notifyQuotaExhausted: jest.fn(),
    notifyInvitation: jest.fn(),
    notifyVictory: jest.fn()
  };

  return {
    notificationService,
    notificationServiceMock: notificationService
  };
});

type ProviderMocks = {
  getBestMove: jest.Mock;
  evaluatePosition: jest.Mock;
  analyzeGame: jest.Mock;
};

jest.mock('../src/server', () => require('./utils/prismaMock'));
jest.mock('../src/lib/prisma', () => require('./utils/prismaMock'));

jest.mock('../src/providers/gnubgProvider', () => {
  const providerMocks: ProviderMocks = {
    getBestMove: jest.fn(),
    evaluatePosition: jest.fn(),
    analyzeGame: jest.fn()
  };

  return {
    GNUBGProvider: jest.fn().mockImplementation(() => providerMocks),
    providerMocks
  };
});

jest.mock('../src/services/subscriptionService', () => {
  const getUserPlanMock = jest.fn();
  return {
    SubscriptionService: {
      getUserPlan: getUserPlanMock
    },
    getUserPlanMock
  };
});

const getProviderMocks = (): ProviderMocks =>
  (jest.requireMock('../src/providers/gnubgProvider') as { providerMocks: ProviderMocks }).providerMocks;

const getUserPlanMock = (): jest.Mock =>
  (jest.requireMock('../src/services/subscriptionService') as { getUserPlanMock: jest.Mock }).getUserPlanMock;

const getNotificationServiceMock = (): NotificationServiceMock =>
  (jest.requireMock('../src/services/notificationService') as { notificationService: NotificationServiceMock }).notificationService;

describe('GNUBG quota consumption', () => {
  const baseNow = new Date('2024-01-01T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(baseNow);

    resetDatabase();

    const notificationServiceMock = getNotificationServiceMock();
    Object.values(notificationServiceMock).forEach(fn => fn.mockReset());

    const providerMocks = getProviderMocks();
    providerMocks.getBestMove.mockReset().mockResolvedValue({ move: null, explanation: '', equity: 0 });
    providerMocks.evaluatePosition.mockReset().mockResolvedValue({ equity: 0, pr: 0 });

    const subscriptionMock = getUserPlanMock();
    subscriptionMock.mockReset().mockImplementation(async (userId: string) =>
      userId.includes('premium') ? 'premium' : 'free'
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows GNUBG call when quota is available', async () => {
    const userId = 'free-available';

    await expect(getHint({ board: {}, dice: [1, 2], userId })).resolves.toMatchObject({ move: null });

    expect(getProviderMocks().getBestMove).toHaveBeenCalledTimes(1);

    const quota = getIAQuota(userId);
    expect(quota).not.toBeNull();
    expect(quota?.dailyQuota).toBe(4);
    expect(quota?.premiumQuota).toBe(0);
  });

  it('blocks GNUBG call when quota is exhausted', async () => {
    const userId = 'free-exhausted';
    const futureReset = new Date(baseNow.getTime() + 60 * 60 * 1000);

    seedIAQuota({
      userId,
      dailyQuota: 0,
      premiumQuota: 0,
      extrasUsed: 0,
      resetAt: futureReset
    });

    await expect(getHint({ board: {}, dice: [1, 2], userId })).rejects.toBeInstanceOf(QuotaExceededError);

    expect(getProviderMocks().getBestMove).not.toHaveBeenCalled();
    const notificationServiceMock = getNotificationServiceMock();
    expect(notificationServiceMock.notifyQuotaExhausted).toHaveBeenCalledTimes(1);
    expect(notificationServiceMock.notifyQuotaExhausted).toHaveBeenCalledWith(userId, expect.objectContaining({
      plan: 'free'
    }));
  });

  it('consumes extras when standard quota exhausted', async () => {
    const userId = 'free-extras';
    const futureReset = new Date(baseNow.getTime() + 60 * 60 * 1000);

    seedIAQuota({
      userId,
      dailyQuota: 0,
      premiumQuota: 0,
      extrasUsed: 2,
      resetAt: futureReset
    });

    await expect(evaluatePosition({ board: {}, userId })).resolves.toEqual({ equity: 0, pr: 0 });

    expect(getProviderMocks().evaluatePosition).toHaveBeenCalledTimes(1);

    const quota = getIAQuota(userId);
    expect(quota).not.toBeNull();
    expect(quota?.extrasUsed).toBe(1);
  });

  it('resets quotas automatically when resetAt has passed', async () => {
    const userId = 'premium-reset';
    const pastReset = new Date(baseNow.getTime() - 60 * 60 * 1000);

    seedIAQuota({
      userId,
      dailyQuota: 0,
      premiumQuota: 0,
      extrasUsed: 5,
      resetAt: pastReset
    });

    await expect(getHint({ board: {}, dice: [3, 4], userId })).resolves.toMatchObject({ move: null });

    const quota = getIAQuota(userId);
    expect(quota).not.toBeNull();
    expect(quota?.premiumQuota).toBe(9);
    expect(quota?.dailyQuota).toBe(0);
    expect(quota?.extrasUsed).toBe(0);
    expect(quota?.resetAt.getTime()).toBeGreaterThan(baseNow.getTime());
    const notificationServiceMock = getNotificationServiceMock();
    expect(notificationServiceMock.notifyQuotaReset).toHaveBeenCalledTimes(1);
    expect(notificationServiceMock.notifyQuotaReset).toHaveBeenCalledWith(userId, expect.objectContaining({
      plan: 'premium'
    }));
  });

  it('prioritizes premium quota before daily quota for premium users', async () => {
    const userId = 'premium-priority';
    const futureReset = new Date(baseNow.getTime() + 60 * 60 * 1000);

    seedIAQuota({
      userId,
      dailyQuota: 3,
      premiumQuota: 2,
      extrasUsed: 5,
      resetAt: futureReset
    });

    await expect(getHint({ board: {}, dice: [5, 6], userId })).resolves.toMatchObject({ move: null });

    const quota = getIAQuota(userId);
    expect(quota).not.toBeNull();
    expect(quota?.premiumQuota).toBe(1);
    expect(quota?.dailyQuota).toBe(3);
    expect(quota?.extrasUsed).toBe(5);
  });

  it('falls back to daily quota when premium quota is exhausted', async () => {
    const userId = 'premium-fallback';
    const futureReset = new Date(baseNow.getTime() + 60 * 60 * 1000);

    seedIAQuota({
      userId,
      dailyQuota: 4,
      premiumQuota: 0,
      extrasUsed: 0,
      resetAt: futureReset
    });

    await expect(getHint({ board: {}, dice: [2, 5], userId })).resolves.toMatchObject({ move: null });

    const quota = getIAQuota(userId);
    expect(quota).not.toBeNull();
    expect(quota?.dailyQuota).toBe(3);
    expect(quota?.premiumQuota).toBe(0);
  });

  it('does not consume extras when standard quota remains', async () => {
    const userId = 'free-standard-first';
    const futureReset = new Date(baseNow.getTime() + 60 * 60 * 1000);

    seedIAQuota({
      userId,
      dailyQuota: 2,
      premiumQuota: 0,
      extrasUsed: 3,
      resetAt: futureReset
    });

    await expect(evaluatePosition({ board: {}, userId })).resolves.toEqual({ equity: 0, pr: 0 });

    const quota = getIAQuota(userId);
    expect(quota).not.toBeNull();
    expect(quota?.dailyQuota).toBe(1);
    expect(quota?.extrasUsed).toBe(3);
  });

  it('prevents over-consumption under concurrent load', async () => {
    const userId = 'free-concurrency';
    const futureReset = new Date(baseNow.getTime() + 60 * 60 * 1000);

    seedIAQuota({
      userId,
      dailyQuota: 5,
      premiumQuota: 0,
      extrasUsed: 0,
      resetAt: futureReset
    });

    const attempts = 20;
    const tasks = Array.from({ length: attempts }, () => getHint({ board: {}, dice: [1, 2], userId }));
    const results = (await Promise.allSettled(tasks)) as PromiseSettledResult<SuggestedMove>[];

    const fulfilled = results.filter(result => result.status === 'fulfilled') as PromiseFulfilledResult<SuggestedMove>[];
    const rejected = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(5);
    expect(rejected).toHaveLength(attempts - 5);
    rejected.forEach(result => expect(result.reason).toBeInstanceOf(QuotaExceededError));

    expect(getProviderMocks().getBestMove).toHaveBeenCalledTimes(5);

    const quota = getIAQuota(userId);
    expect(quota).not.toBeNull();
    expect(quota?.dailyQuota).toBe(0);
    expect(quota?.premiumQuota).toBe(0);
    expect(quota?.extrasUsed).toBe(0);
    const notificationServiceMock = getNotificationServiceMock();
    expect(notificationServiceMock.notifyQuotaExhausted).toHaveBeenCalled();
  });

  it('prevents over-consumption of extra quota bursts', async () => {
    const userId = 'free-extra-burst';
    const futureReset = new Date(baseNow.getTime() + 60 * 60 * 1000);

    seedIAQuota({
      userId,
      dailyQuota: 0,
      premiumQuota: 0,
      extrasUsed: 3,
      resetAt: futureReset
    });

    const attempts = 10;
    const tasks = Array.from({ length: attempts }, () => evaluatePosition({ board: {}, userId }));
    const results = (await Promise.allSettled(tasks)) as PromiseSettledResult<Awaited<ReturnType<typeof evaluatePosition>>>[];

    const fulfilled = results.filter(result => result.status === 'fulfilled');
    const rejected = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(3);
    expect(rejected).toHaveLength(attempts - 3);
    rejected.forEach(result => expect(result.reason).toBeInstanceOf(QuotaExceededError));

    expect(getProviderMocks().evaluatePosition).toHaveBeenCalledTimes(3);

    const quota = getIAQuota(userId);
    expect(quota).not.toBeNull();
    expect(quota?.dailyQuota).toBe(0);
    expect(quota?.premiumQuota).toBe(0);
    expect(quota?.extrasUsed).toBe(0);
    const notificationServiceMock = getNotificationServiceMock();
    expect(notificationServiceMock.notifyQuotaExhausted).toHaveBeenCalled();
  });

  it('restores quota after reset for subsequent bursts', async () => {
    const userId = 'free-reset-burst';
    const initialReset = new Date(baseNow.getTime() + 30 * 60 * 1000);

    seedIAQuota({
      userId,
      dailyQuota: 1,
      premiumQuota: 0,
      extrasUsed: 0,
      resetAt: initialReset
    });

    const firstAttempts = 10;
    const firstTasks = Array.from({ length: firstAttempts }, () => getHint({ board: {}, dice: [1, 2], userId }));
    const firstResults = (await Promise.allSettled(firstTasks)) as PromiseSettledResult<SuggestedMove>[];

    const firstFulfilled = firstResults.filter(result => result.status === 'fulfilled');
    const firstRejected = firstResults.filter(result => result.status === 'rejected') as PromiseRejectedResult[];

    expect(firstFulfilled).toHaveLength(1);
    expect(firstRejected).toHaveLength(firstAttempts - 1);
    firstRejected.forEach(result => expect(result.reason).toBeInstanceOf(QuotaExceededError));
    expect(getProviderMocks().getBestMove).toHaveBeenCalledTimes(1);

    const quotaAfterFirst = getIAQuota(userId);
    expect(quotaAfterFirst?.dailyQuota).toBe(0);

    jest.setSystemTime(new Date(initialReset.getTime() + 1000));

    const providerMocks = getProviderMocks();
    providerMocks.getBestMove.mockClear();

    const secondAttempts = 10;
    const secondTasks = Array.from({ length: secondAttempts }, () => getHint({ board: {}, dice: [1, 2], userId }));
    const secondResults = (await Promise.allSettled(secondTasks)) as PromiseSettledResult<SuggestedMove>[];

    const secondFulfilled = secondResults.filter(result => result.status === 'fulfilled');
    const secondRejected = secondResults.filter(result => result.status === 'rejected') as PromiseRejectedResult[];

    expect(secondFulfilled).toHaveLength(5);
    expect(secondRejected).toHaveLength(secondAttempts - 5);
    secondRejected.forEach(result => expect(result.reason).toBeInstanceOf(QuotaExceededError));
    expect(providerMocks.getBestMove).toHaveBeenCalledTimes(5);

    const quotaAfterSecond = getIAQuota(userId);
    expect(quotaAfterSecond?.dailyQuota).toBe(0);
    expect(quotaAfterSecond?.premiumQuota).toBe(0);
    expect(quotaAfterSecond?.extrasUsed).toBe(0);
    const notificationServiceMock = getNotificationServiceMock();
    expect(notificationServiceMock.notifyQuotaReset).toHaveBeenCalled();
  });
});
