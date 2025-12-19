// src/types/game.ts
// Types pour les parties de backgammon

import type { GameMode } from '@prisma/client';
import type { CubeHistoryEntry } from '../services/rules/cubeLogic';
import { defaultCrawfordState, type CrawfordState } from '../services/rules/matchEngine';
import type { Player } from './player';

// Types pour le statut d'une partie
export type GameStatus = 'waiting' | 'playing' | 'completed' | 'abandoned' | 'draw_pending';

// Types pour le type de partie
export type GameType = 'match' | 'money_game' | 'tournament';

// Types techniques du backgammon
export interface BoardState {
  positions: number[];     // 24 positions, + = white, - = black
  whiteBar: number;        // Pièces blanches capturées
  blackBar: number;        // Pièces noires capturées
  whiteOff: number;        // Pièces blanches sorties
  blackOff: number;        // Pièces noires sorties
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
  dice: [number, number];  // Valeurs des dés
  used: boolean[];         // Dés utilisés ou non
  doubles: boolean;        // Si doubles (4 mouvements)
  remaining: number[];     // Valeurs restantes à jouer
}

export interface Move {
  from: number;            // Position de départ (0-23, 24=bar, 25=off)
  to: number;              // Position d'arrivée
  player: 'white' | 'black';
  diceUsed: number;        // Valeur du dé utilisée
}

// Types manquants ajoutés
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

// Interface pour une partie (compatible avec Prisma)
export interface Game {
  id: string;           // Identifiant unique de la partie
  player1: Player;      // Premier joueur (créateur de la partie)
  player2: Player | null; // Deuxième joueur (null si en attente)
  status: GameStatus;   // Statut actuel de la partie
  gameType: GameType;   // Type de partie
  stake: number;        // Mise en points
  timeControl: TimeControlPreset | null;
  whiteTimeMs: number | null;
  blackTimeMs: number | null;
  matchLength: number | null;
  crawford: CrawfordState;
  cube: CubeSnapshot;
  whiteScore: number;
  blackScore: number;
  winner: Player | null; // Gagnant (null si pas terminé)
  createdAt: Date;      // Date de création
  startedAt: Date | null; // Date de début (null si pas commencé)
  finishedAt: Date | null; // Date de fin (null si pas terminé)
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

// Types pour les requêtes API
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

// Initial board setup pour backgammon
export const INITIAL_BOARD: BoardState = {
  positions: [
    2, 0, 0, 0, 0, -5,   // Positions 1-6
    0, -3, 0, 0, 0, 5,   // Positions 7-12
    -5, 0, 0, 0, 3, 0,   // Positions 13-18
    5, 0, 0, 0, 0, -2    // Positions 19-24
  ],
  whiteBar: 0,
  blackBar: 0,
  whiteOff: 0,
  blackOff: 0
};

// Fonction pour créer une nouvelle partie
export function createGame(
  player1: Player,
  gameType: GameType,
  stake: number
): Game {
  return {
    id: crypto.randomUUID(),
    player1,
    player2: null,      // En attente d'un adversaire
    status: 'waiting',
    gameType,
    stake,
    timeControl: null,
    whiteTimeMs: null,
    blackTimeMs: null,
    matchLength: null,
    crawford: defaultCrawfordState(),
    cube: {
      level: 1,
      owner: null,
      isCentered: true,
      doublePending: false,
      doubleOfferedBy: null,
      history: []
    },
    whiteScore: 0,
    blackScore: 0,
    winner: null,
    createdAt: new Date(),
    startedAt: null,
    finishedAt: null
  };
}

// Fonction pour créer un état de jeu initial
export function createInitialGameState(player1: Player): GameState {
  return {
    ...createGame(player1, 'match', 100),
    whiteScore: 0,
    blackScore: 0,
    timeControl: null,
    whiteTimeMs: null,
    blackTimeMs: null,
    matchLength: null,
    crawford: defaultCrawfordState(),
    cube: {
      level: 1,
      owner: null,
      isCentered: true,
      doublePending: false,
      doubleOfferedBy: null,
      history: []
    },
    drawOfferBy: null,
    board: INITIAL_BOARD,
    currentPlayer: 'white',
    dice: {
      dice: [1, 1],
      used: [false, false],
      doubles: false,
      remaining: [1, 1]
    },
    availableMoves: []
  };
}

// Fonction pour démarrer une partie
export function startGame(game: Game, player2: Player): Game {
  return {
    ...game,
    player2,
    status: 'playing',
    timeControl: game.timeControl ?? null,
    startedAt: new Date()
  };
}

// Fonction pour terminer une partie
export function finishGame(game: Game, winner: Player): Game {
  return {
    ...game,
    status: 'completed',
    winner,
    finishedAt: new Date()
  };
}

// Fonction pour vérifier si une partie est disponible
export function isGameAvailable(game: Game): boolean {
  return game.status === 'waiting' && game.player2 === null;
}

// Fonction pour calculer la durée d'une partie
export function getGameDuration(game: Game): number | null {
  if (!game.startedAt || !game.finishedAt) {
    return null;
  }
  return game.finishedAt.getTime() - game.startedAt.getTime();
}
