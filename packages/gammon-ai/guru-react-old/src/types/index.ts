export type PlayerColor = 'white' | 'black';

export interface BoardState {
  points: number[]; // 0-23, indices du tableau. >0 = white, <0 = black
  whiteBar: number;
  blackBar: number;
  whiteOff: number;
  blackOff: number;
}

export interface MoveRecord {
  player: PlayerColor;
  from: number;
  to: number;
  notation: string;
}

export interface GameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  dice: number[];
  selectedPoint: number | null; // null si rien sélectionné, 0-23 ou -1 (bar)
  validMoves: number[]; // Indices des points où on peut aller
  winner: PlayerColor | null;
  lastMove?: { from: number; to: number } | null;
  hintMove?: { from: number; to: number } | null;
  moveHistory: MoveRecord[];
  cubeLevel?: number;
  cubeOwner?: PlayerColor | null;
  doublePending?: boolean;
  doubleOfferedBy?: PlayerColor | null;
}

export const INITIAL_BOARD: number[] = [
  -2, 0, 0, 0, 0, 5,   // 1-6:  Pt 1 (2 Noirs), Pt 6 (5 Blancs)
  0, 3, 0, 0, 0, -5,   // 7-12: Pt 8 (3 Blancs), Pt 12 (5 Noirs)
  5, 0, 0, 0, -3, 0,   // 13-18: Pt 13 (5 Blancs), Pt 17 (3 Noirs)
  -5, 0, 0, 0, 0, 2    // 19-24: Pt 19 (5 Noirs), Pt 24 (2 Blancs)
];
