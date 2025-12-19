import { useState, useCallback, useEffect } from 'react';
import { INITIAL_BOARD } from '../types';
import type { GameState } from '../types';
import { apiClient } from '../api/client';
import { useGameSocket, type SocketMessage } from './useGameSocket';

type BackendBoardState = {
  positions: number[];
  whiteBar: number;
  blackBar: number;
  whiteOff: number;
  blackOff: number;
};

type BackendDiceState = {
  dice: [number, number];
  remaining: number[];
  doubles: boolean;
  used: boolean[];
};

type BackendGameState = {
  board: BackendBoardState;
  currentPlayer: 'white' | 'black';
  dice: BackendDiceState;
  cube?: {
    level: number;
    owner: 'white' | 'black' | null;
    doublePending: boolean;
    doubleOfferedBy: 'white' | 'black' | null;
  };
};

type GameApiResponse =
  | { success: boolean; data: { game: BackendGameState } }
  | { game: BackendGameState }
  | BackendGameState;

export type UseBackgammonOptions = {
  /** Identifiant de partie backend. S'il est absent, le hook fonctionne en mode local uniquement. */
  gameId?: string | number | null;
};

const createLocalInitialState = (): GameState => ({
  board: {
    points: [...INITIAL_BOARD],
    whiteBar: 0,
    blackBar: 0,
    whiteOff: 0,
    blackOff: 0
  },
  currentPlayer: 'white',
  dice: [],
  selectedPoint: null,
  validMoves: [],
  winner: null,
  lastMove: null,
  hintMove: null,
  moveHistory: [],
  cubeLevel: 1,
  cubeOwner: null,
  doublePending: false,
  doubleOfferedBy: null
});

const determineWinnerFromBoard = (board: BackendBoardState): 'white' | 'black' | null => {
  if (board.whiteOff === 15) return 'white';
  if (board.blackOff === 15) return 'black';
  return null;
};

const extractBackendGame = (response: GameApiResponse): BackendGameState => {
  const anyResp = response as any;
  if (anyResp?.data?.game) return anyResp.data.game;
  if (anyResp?.game) return anyResp.game;
  return anyResp as BackendGameState;
};

const mapBackendGameToLocal = (backend: BackendGameState): GameState => {
  const board = backend.board;
  const dice = backend.dice?.remaining?.length ? backend.dice.remaining : backend.dice?.dice ?? [];

  return {
    board: {
      points: [...board.positions],
      whiteBar: board.whiteBar,
      blackBar: board.blackBar,
      whiteOff: board.whiteOff,
      blackOff: board.blackOff
    },
    currentPlayer: backend.currentPlayer,
    dice,
    selectedPoint: null,
    validMoves: [],
    winner: determineWinnerFromBoard(board),
    lastMove: null,
    hintMove: null,
    moveHistory: [],
    cubeLevel: backend.cube?.level ?? 1,
    cubeOwner: backend.cube?.owner ?? null,
    doublePending: backend.cube?.doublePending ?? false,
    doubleOfferedBy: backend.cube?.doubleOfferedBy ?? null
  };
};

export const useBackgammon = (options?: UseBackgammonOptions) => {
  const gameId = options?.gameId ?? null;

  const [gameState, setGameState] = useState<GameState>(createLocalInitialState);
  const [error, setError] = useState<string | null>(null);

  const handleSocketEvent = useCallback((message: SocketMessage) => {
    if (message.type === 'GAME_MOVE' || message.type === 'GAME_CUBE') {
      const payload = message.payload as any;
      const move = payload && payload.move ? payload.move : payload;
      // Handle cube events which might be nested differently or have different structure
      const gameData = payload.game ?? payload;

      if (gameData && gameData.board && gameData.dice && gameData.currentPlayer) {
        const backendGame: BackendGameState = {
          board: gameData.board,
          dice: gameData.dice,
          currentPlayer: gameData.currentPlayer,
          cube: gameData.cube
        };
        setGameState(mapBackendGameToLocal(backendGame));
      } else if (move && move.board && move.dice && move.currentPlayer) {
        // Fallback for move events
        const isRollEvent = move.eventType === 'roll';
        if (isRollEvent) {
          console.debug('WS roll event', move);
        }
        const backendGame: BackendGameState = {
          board: move.board,
          dice: move.dice,
          currentPlayer: move.currentPlayer,
          cube: move.cube // Assuming cube state is passed in move events too
        };
        setGameState(mapBackendGameToLocal(backendGame));
      }
    }
  }, []);

  const { status: connectionStatus, reconnect } = useGameSocket(gameId, handleSocketEvent);

  // Charger l'état initial depuis le backend si un gameId est fourni
  useEffect(() => {
    if (!gameId) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        setError(null);
        const response = await apiClient.getGameStatus<GameApiResponse>(gameId, { signal: controller.signal });
        if (cancelled) return;
        const backendGame = extractBackendGame(response);
        setGameState(mapBackendGameToLocal(backendGame));
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Erreur lors du chargement de la partie.';
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [gameId]);

  const rollDice = useCallback(async () => {
    // Mode backend : déléguer à l'API
    if (gameId) {
      try {
        setError(null);
        const response = await apiClient.rollDice<GameApiResponse>(gameId);
        const backendGame = extractBackendGame(response);
        setGameState(mapBackendGameToLocal(backendGame));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors du lancer de dés.';
        setError(message);
      }
      return;
    }

    // Mode local (fallback sans backend)
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const newDice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];

    setGameState(prev => ({
      ...prev,
      dice: newDice,
      selectedPoint: null,
      validMoves: []
    }));
  }, [gameId]);

  const sendMoveToBackend = useCallback(
    async (from: number, to: number) => {
      if (!gameId) return;

      // Approximation : on utilise la distance comme valeur de dé; le backend validera ou rejettera.
      const diceUsed = Math.abs(to - from);

      try {
        setError(null);
        const response = await apiClient.makeMove<GameApiResponse>(gameId, { from, to, diceUsed });
        const backendGame = extractBackendGame(response);
        setGameState(mapBackendGameToLocal(backendGame));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de la tentative de coup.';
        setError(message);

        // Tenter de resynchroniser l'état local avec le backend
        try {
          const statusResponse = await apiClient.getGameStatus<GameApiResponse>(gameId);
          const backendGame = extractBackendGame(statusResponse);
          setGameState(mapBackendGameToLocal(backendGame));
        } catch {
          // on ignore une éventuelle seconde erreur
        }
      }
    },
    [gameId]
  );

  const offerDouble = useCallback(async () => {
    if (!gameId) return;
    try {
      setError(null);
      const response = await apiClient.offerDouble<GameApiResponse>(gameId);
      const backendGame = extractBackendGame(response);
      setGameState(mapBackendGameToLocal(backendGame));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to offer double.';
      setError(message);
    }
  }, [gameId]);

  const respondToDouble = useCallback(async (accept: boolean, beaver: boolean = false, raccoon: boolean = false) => {
    if (!gameId) return;
    try {
      setError(null);
      const response = await apiClient.respondToDouble<GameApiResponse>(gameId, accept, beaver, raccoon);
      const backendGame = extractBackendGame(response);
      setGameState(mapBackendGameToLocal(backendGame));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to respond to double.';
      setError(message);
    }
  }, [gameId]);

  const requestHint = useCallback(async () => {
    if (!gameId) {
      setError('Les suggestions IA nécessitent une partie en ligne (gameId).');
      return;
    }

    try {
      setError(null);
      // Effacer une éventuelle suggestion précédente avant de demander la suivante
      setGameState(prev => ({
        ...prev,
        hintMove: null
      }));

      const response = await apiClient.getSuggestions<any>(gameId);
      const anyResp = response as any;
      const suggestion = anyResp?.data?.suggestion ?? anyResp?.suggestion ?? null;
      const move = suggestion?.move;

      if (move && typeof move.from === 'number' && typeof move.to === 'number') {
        setGameState(prev => ({
          ...prev,
          hintMove: { from: move.from, to: move.to }
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la demande de suggestion IA.';
      setError(message);
    }
  }, [gameId]);

  const handlePointClick = useCallback(
    (pointIndex: number) => {
      // Mode backend : envoyer les coups au serveur
      if (gameId) {
        setGameState(prev => {
          // Si aucun état ou aucun dé, on ne fait rien
          if (!prev || prev.dice.length === 0) return prev;

          const { board, currentPlayer, selectedPoint } = prev;
          const clickedPointCount = board.points[pointIndex];

          // Première sélection : vérifier que la case appartient au joueur courant
          if (selectedPoint === null) {
            const isPlayerPiece = currentPlayer === 'white' ? clickedPointCount > 0 : clickedPointCount < 0;
            if (!isPlayerPiece) {
              return prev;
            }

            return {
              ...prev,
              selectedPoint: pointIndex,
              validMoves: []
            };
          }

          // Cliquer à nouveau sur la même case désélectionne
          if (selectedPoint === pointIndex) {
            return {
              ...prev,
              selectedPoint: null,
              validMoves: []
            };
          }

          // Tenter un coup depuis selectedPoint vers pointIndex
          void sendMoveToBackend(selectedPoint, pointIndex);

          return {
            ...prev,
            selectedPoint: null,
            validMoves: []
          };
        });

        return;
      }

      // Mode local (comportement précédent amélioré)
      setGameState(prev => {
        // Si aucun dé, on ne fait rien
        if (prev.dice.length === 0) return prev;

        const { board, currentPlayer, selectedPoint } = prev;
        const clickedPointCount = board.points[pointIndex];
        const direction = currentPlayer === 'white' ? -1 : 1;
        const barCount = currentPlayer === 'white' ? board.whiteBar : board.blackBar;

        // Helper pour vérifier si une destination est valide (pas bloquée par l'adversaire)
        const isDestinationBlocked = (idx: number) => {
          if (idx < 0 || idx > 23) return false; // Bearing off logic separate
          const count = board.points[idx];
          // Bloqué si plus de 1 pion adverse
          if (currentPlayer === 'white') return count < -1; // Noir a -2, -3...
          return count > 1; // Blanc a 2, 3...
        };

        // 1. Sélectionner un pion
        if (selectedPoint === null) {
          // Cas spécial : Si des pions sont sur la barre, on DOIT les jouer
          if (barCount > 0) {
            // Simplification : On considère que si bar > 0, on a automatiquement "sélectionné" la barre.
            // On vérifie juste si pointIndex est une destination valide pour un dé.

            const entryPoint = currentPlayer === 'white' ? 24 : -1; // Point virtuel de départ
            const validDiceIndex = prev.dice.findIndex(die => {
              const dest = entryPoint + (die * direction);
              return dest === pointIndex && !isDestinationBlocked(dest);
            });

            if (validDiceIndex !== -1) {
              // On joue directement depuis la barre
              // Mise à jour du board
              const newPoints = [...board.points];
              let newWhiteBar = board.whiteBar;
              let newBlackBar = board.blackBar;
              const newWhiteOff = board.whiteOff;
              const newBlackOff = board.blackOff;

              // Enlever de la barre
              if (currentPlayer === 'white') newWhiteBar--;
              else newBlackBar--;

              // Arrivée
              const targetCount = newPoints[pointIndex];
              // Hit ?
              const isHit = (currentPlayer === 'white' && targetCount === -1) || (currentPlayer === 'black' && targetCount === 1);

              if (isHit) {
                newPoints[pointIndex] = currentPlayer === 'white' ? 1 : -1;
                if (currentPlayer === 'white') newBlackBar++;
                else newWhiteBar++;
              } else {
                newPoints[pointIndex] += (currentPlayer === 'white' ? 1 : -1);
              }

              const newDice = [...prev.dice];
              newDice.splice(validDiceIndex, 1);
              const nextPlayer = newDice.length === 0 ? (currentPlayer === 'white' ? 'black' : 'white') : currentPlayer;

              return {
                ...prev,
                board: {
                  ...board,
                  points: newPoints,
                  whiteBar: newWhiteBar,
                  blackBar: newBlackBar,
                  whiteOff: newWhiteOff,
                  blackOff: newBlackOff
                },
                dice: newDice,
                currentPlayer: nextPlayer,
                lastMove: { from: -1, to: pointIndex }, // -1 pour indiquer barre
                moveHistory: [...prev.moveHistory, { player: currentPlayer, from: -1, to: pointIndex, notation: `Bar/${pointIndex + 1}` }]
              };
            }
            return prev;
          }

          // Cas normal (pas de barre)
          // Vérifier si le point appartient au joueur courant
          const isPlayerPiece = currentPlayer === 'white' ? clickedPointCount > 0 : clickedPointCount < 0;

          if (isPlayerPiece) {
            const possibleDestinations = [...new Set(prev.dice)]
              .map(die => pointIndex + (die * direction))
              .filter(dest => {
                if (dest < 0 || dest > 23) return false;
                return !isDestinationBlocked(dest);
              });

            return {
              ...prev,
              selectedPoint: pointIndex,
              validMoves: possibleDestinations
            };
          }
          return prev;
        }

        // 2. Déplacer le pion (Si on clique sur une destination valide)
        if (prev.validMoves.includes(pointIndex)) {
          const moveDistance = Math.abs(pointIndex - selectedPoint);
          // Trouver quel dé a été utilisé
          const dieIndex = prev.dice.findIndex(d => d === moveDistance);

          if (dieIndex === -1) {
            return { ...prev, selectedPoint: null, validMoves: [] };
          }

          // Mettre à jour le board
          const newPoints = [...board.points];
          let newWhiteBar = board.whiteBar;
          let newBlackBar = board.blackBar;

          // Enlever du départ
          newPoints[selectedPoint] = currentPlayer === 'white' ? newPoints[selectedPoint] - 1 : newPoints[selectedPoint] + 1;

          // Ajouter à l'arrivée
          const targetCount = newPoints[pointIndex];
          // Hit ?
          const isHit = (currentPlayer === 'white' && targetCount === -1) || (currentPlayer === 'black' && targetCount === 1);

          if (isHit) {
            newPoints[pointIndex] = currentPlayer === 'white' ? 1 : -1;
            if (currentPlayer === 'white') newBlackBar++;
            else newWhiteBar++;
          } else {
            newPoints[pointIndex] += (currentPlayer === 'white' ? 1 : -1);
          }

          const newDice = [...prev.dice];
          newDice.splice(dieIndex, 1);

          const nextPlayer = newDice.length === 0 ? (currentPlayer === 'white' ? 'black' : 'white') : currentPlayer;

          const fromIndex = selectedPoint;
          const toIndex = pointIndex;
          const notation = `${fromIndex + 1}/${toIndex + 1}`;

          return {
            ...prev,
            board: { ...board, points: newPoints, whiteBar: newWhiteBar, blackBar: newBlackBar },
            dice: newDice,
            currentPlayer: nextPlayer,
            selectedPoint: null,
            validMoves: [],
            lastMove: { from: selectedPoint, to: pointIndex },
            moveHistory: [
              ...prev.moveHistory,
              {
                player: currentPlayer,
                from: fromIndex,
                to: toIndex,
                notation
              }
            ]
          };
        }

        // Désélectionner si on clique ailleurs ou sur le même
        return {
          ...prev,
          selectedPoint: null,
          validMoves: []
        };
      });
    },
    [gameId, sendMoveToBackend]
  );

  return {
    gameState,
    rollDice,
    handlePointClick,
    requestHint,
    offerDouble,
    respondToDouble,
    error,
    connectionStatus,
    reconnect
  };
};
