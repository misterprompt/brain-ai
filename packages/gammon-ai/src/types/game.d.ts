import type { GameMode } from '@prisma/client';
import type { CubeHistoryEntry } from '../services/rules/cubeLogic';
import { type CrawfordState } from '../services/rules/matchEngine';
import type { Player } from './player';
export type GameStatus = 'waiting' | 'playing' | 'completed' | 'abandoned' | 'draw_pending';
export type GameType = 'match' | 'money_game' | 'tournament';
export interface BoardState {
    positions: number[];
    whiteBar: number;
    blackBar: number;
    whiteOff: number;
    blackOff: number;
}
export interface CubeSnapshot {
    level: number;
    owner: PlayerColor | null;
    isCentered: boolean;
    doublePending: boolean;
    doubleOfferedBy: PlayerColor | null;
    history: CubeHistoryEntry[];
}
export interface DiceState {
    dice: [number, number];
    used: boolean[];
    doubles: boolean;
    remaining: number[];
}
export interface Move {
    from: number;
    to: number;
    player: 'white' | 'black';
    diceUsed: number;
}
export type PlayerColor = 'white' | 'black';
export interface ValidationResult {
    valid: boolean;
    error?: string;
    availableMoves?: Move[];
}
export interface GameState {
    id: string;
    player1: Player;
    player2: Player | null;
    status: GameStatus;
    gameType: GameType;
    stake: number;
    timeControl: TimeControlPreset | null;
    whiteTimeMs: number | null;
    blackTimeMs: number | null;
    matchLength: number | null;
    crawford: CrawfordState;
    cube: CubeSnapshot;
    whiteScore: number;
    blackScore: number;
    winner: Player | null;
    drawOfferBy: PlayerColor | null;
    board: BoardState;
    currentPlayer: 'white' | 'black';
    dice: DiceState;
    availableMoves: Move[];
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
}
export type TimeControlPreset = 'BLITZ' | 'NORMAL' | 'LONG' | 'CUSTOM';
export interface TimeControlConfig {
    preset: TimeControlPreset;
    totalTimeMs: number;
    incrementMs: number;
    delayMs: number;
}
export interface Game {
    id: string;
    player1: Player;
    player2: Player | null;
    status: GameStatus;
    gameType: GameType;
    stake: number;
    timeControl: TimeControlPreset | null;
    whiteTimeMs: number | null;
    blackTimeMs: number | null;
    matchLength: number | null;
    crawford: CrawfordState;
    cube: CubeSnapshot;
    whiteScore: number;
    blackScore: number;
    winner: Player | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
}
export interface GameSummary {
    id: string;
    status: GameStatus;
    currentPlayer: PlayerColor;
    cube: CubeSnapshot;
    crawford: CrawfordState;
    matchLength: number | null;
    whiteScore: number;
    blackScore: number;
    gameType: GameType;
    stake: number;
    createdAt: Date;
    whitePlayerId?: string;
    blackPlayerId?: string | null;
}
export interface CreateGameRequest {
    gameType: GameType;
    stake: number;
}
export interface JoinGameRequest {
    gameId: string;
}
export interface CreateGameInput {
    userId: string;
    mode: GameMode;
    stake: number;
    opponentId?: string | null;
}
export interface JoinGameInput {
    gameId: string;
    userId: string;
}
export interface RollDiceInput {
    gameId: string;
    userId: string;
}
export interface MoveInput {
    gameId: string;
    userId: string;
    from: number;
    to: number;
    diceUsed: number;
}
export interface ResignGameInput {
    gameId: string;
    userId: string;
}
export interface ResignGameRequest extends ResignGameInput {
    resignationType: 'SINGLE' | 'GAMMON' | 'BACKGAMMON';
}
export interface ResignGameResult {
    gameId: string;
    winner: 'white' | 'black';
    resignationType: 'SINGLE' | 'GAMMON' | 'BACKGAMMON';
    pointsAwarded: number;
    finished: boolean;
}
export interface DrawOfferInput {
    gameId: string;
    userId: string;
}
export interface MakeMoveRequest {
    from: number;
    to: number;
    diceUsed: number;
}
export declare const INITIAL_BOARD: BoardState;
export declare function createGame(player1: Player, gameType: GameType, stake: number): Game;
export declare function createInitialGameState(player1: Player): GameState;
export declare function startGame(game: Game, player2: Player): Game;
export declare function finishGame(game: Game, winner: Player): Game;
export declare function isGameAvailable(game: Game): boolean;
export declare function getGameDuration(game: Game): number | null;
//# sourceMappingURL=game.d.ts.map