import { GameState, Move, MakeMoveRequest, GameSummary, CreateGameInput } from '../types/game';
export declare class GameService {
    static createGame(input: CreateGameInput): Promise<GameState>;
    static getGame(id: string | number): Promise<GameState | null>;
    static getGameSummary(id: string | number): Promise<GameSummary | null>;
    static rollDice(gameId: string, userId: string): Promise<GameState>;
    static makeMove(gameId: string, userId: string, moveRequest: MakeMoveRequest): Promise<GameState>;
    static listAvailableGames(): Promise<GameSummary[]>;
    static joinGame(gameId: string, userId: string): Promise<GameState>;
    static listUserGames(userId: string): Promise<GameSummary[]>;
    static getAvailableMoves(gameId: string, userId: string): Promise<Move[]>;
    static getPipCount(gameId: string): Promise<{
        white: number;
        black: number;
    }>;
    static resignGame(gameId: string, userId: string): Promise<GameState>;
    static offerDouble(gameId: string, userId: string): Promise<GameState>;
    static respondToDouble(gameId: string, userId: string, accept: boolean, beaver?: boolean, raccoon?: boolean): Promise<GameState>;
    static offerDraw(gameId: string, userId: string): Promise<boolean>;
}
//# sourceMappingURL=gameService.d.ts.map