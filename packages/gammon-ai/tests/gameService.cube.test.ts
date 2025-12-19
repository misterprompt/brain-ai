import { GameService } from '../src/services/gameService';
import { prisma } from '../src/lib/prisma';

jest.mock('../src/lib/prisma', () => ({
    prisma: {
        games: {
            findUnique: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
        },
        users: {
            findUnique: jest.fn(),
        }
    }
}));

jest.mock('../src/services/gameEventEmitter', () => ({
    emitGameEvent: jest.fn()
}));

const prismaMock = prisma as any;

describe('GameService Cube Logic', () => {
    const mockBoardState = {
        board: {
            positions: Array(24).fill(0),
            whiteBar: 0,
            blackBar: 0,
            whiteOff: 0,
            blackOff: 0
        },
        dice: {
            dice: [1, 1],
            used: [false, false],
            remaining: [1, 1],
            doubles: false
        }
    };

    const mockGame = {
        id: 'game-1',
        whitePlayerId: 'player-1',
        blackPlayerId: 'player-2',
        currentPlayer: 'WHITE',
        status: 'PLAYING',
        gameMode: 'PLAYER_VS_PLAYER',
        stake: 100,
        cubeLevel: 1,
        cubeOwner: null,
        doublePending: false,
        doubleOfferedBy: null,
        cubeHistory: [],
        matchLength: 5,
        whiteScore: 0,
        blackScore: 0,
        boardState: mockBoardState,
        dice: [1, 1],
        whitePlayer: { id: 'player-1', username: 'P1' },
        blackPlayer: { id: 'player-2', username: 'P2' },
        match: { rules: { crawford: true, beaver: true, raccoon: true, jacoby: false } }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('offerDouble', () => {
        it('should allow offering a double', async () => {
            prismaMock.games.findUnique.mockResolvedValue(mockGame);

            // Mock getGame for the return value
            jest.spyOn(GameService, 'getGame').mockResolvedValue({ ...mockGame, id: 'game-1' } as any);

            await GameService.offerDouble('game-1', 'player-1');

            expect(prismaMock.games.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'game-1' },
                data: expect.objectContaining({
                    cubeLevel: 2,
                    doublePending: true,
                    doubleOfferedBy: 'white'
                })
            }));
        });

        it('should reject double if not player turn', async () => {
            prismaMock.games.findUnique.mockResolvedValue(mockGame);

            await expect(GameService.offerDouble('game-1', 'player-2'))
                .rejects.toThrow('Not your turn');
        });
    });

    describe('respondToDouble', () => {
        const pendingGame = {
            ...mockGame,
            cubeLevel: 2,
            doublePending: true,
            doubleOfferedBy: 'WHITE'
        };

        it('should allow taking a double', async () => {
            prismaMock.games.findUnique.mockResolvedValue(pendingGame);
            jest.spyOn(GameService, 'getGame').mockResolvedValue({ ...pendingGame, id: 'game-1' } as any);

            await GameService.respondToDouble('game-1', 'player-2', true);

            expect(prismaMock.games.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'game-1' },
                data: expect.objectContaining({
                    cubeLevel: 2,
                    cubeOwner: 'BLACK',
                    doublePending: false,
                    doubleOfferedBy: null
                })
            }));
        });

        it('should allow passing a double (resigning game)', async () => {
            prismaMock.games.findUnique.mockResolvedValue(pendingGame);
            jest.spyOn(GameService, 'getGame').mockResolvedValue({ ...pendingGame, id: 'game-1' } as any);

            await GameService.respondToDouble('game-1', 'player-2', false);

            expect(prismaMock.games.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'game-1' },
                data: expect.objectContaining({
                    status: 'COMPLETED',
                    winner: 'WHITE'
                })
            }));
        });

        it('should reject response from wrong player', async () => {
            prismaMock.games.findUnique.mockResolvedValue(pendingGame);

            await expect(GameService.respondToDouble('game-1', 'player-1', true))
                .rejects.toThrow('Cannot respond to your own double');
        });
    });

    describe('listAvailableGames', () => {
        it('should return games with correct summary fields', async () => {
            const mockGames = [{
                ...mockGame,
                createdAt: new Date('2023-01-01'),
                updatedAt: new Date('2023-01-01'),
                whitePlayerId: 'player-1',
                blackPlayerId: null,
                status: 'WAITING',
                gameMode: 'PLAYER_VS_PLAYER',
                stake: 50
            }];

            prismaMock.games.findMany.mockResolvedValue(mockGames);

            const result = await GameService.listAvailableGames();

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                id: 'game-1',
                status: 'waiting',
                gameType: 'match',
                stake: 50,
                whitePlayerId: 'player-1',
                blackPlayerId: null
            });
            expect(result[0].createdAt).toBeInstanceOf(Date);
        });
    });
});
