import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export type LobbyGame = {
  id: string;
  status?: string;
  gameType?: string;
  stake?: number;
  currentPlayer?: string | null;
};

export type LobbyProps = {
  onGameSelected?: (gameId: string) => void;
};

export function Lobby({ onGameSelected }: LobbyProps) {
  const [games, setGames] = useState<LobbyGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [stake, setStake] = useState<number>(0);
  const [mode, setMode] = useState<'AI_VS_PLAYER' | 'PLAYER_VS_PLAYER'>('PLAYER_VS_PLAYER');

  const loadAvailableGames = async () => {
    setLoading(true);
    setError(null);
    try {
      // L'API pourra renvoyer un wrapper { success, data } ou directement un tableau; on gère les deux.
      const response = await apiClient.getAvailableGames<any>();
      const anyResp = response as any;
      const rawGames: any[] =
        Array.isArray(anyResp) ? anyResp : Array.isArray(anyResp?.data) ? anyResp.data : [];

      const mapped: LobbyGame[] = rawGames.map((g: any) => ({
        id: String(g.id ?? g.gameId ?? ''),
        status: g.status ?? undefined,
        gameType: g.gameType ?? g.game_mode ?? undefined,
        stake: typeof g.stake === 'number' ? g.stake : undefined,
        currentPlayer: g.currentPlayer ?? null
      }));

      setGames(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des parties disponibles.';
      setError(message);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAvailableGames();
  }, []);

  const handleCreateGame = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const response = await apiClient.createGame<any>({
        gameType: mode,
        stake,
        opponentId: null
      });
      const anyResp = response as any;
      const created = anyResp?.data?.game ?? anyResp?.game ?? anyResp;
      if (created?.id && onGameSelected) {
        onGameSelected(String(created.id));
      }
      // Recharger la liste
      void loadAvailableGames();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création de la partie.';
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (gameId: string) => {
    try {
      setError(null);
      await apiClient.joinGame(gameId);
      if (onGameSelected) {
        onGameSelected(gameId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de rejoindre la partie.";
      setError(message);
    }
  };

  return (
    <div className="lobby container" style={{ color: 'white' }}>
      <h2>Lobby des parties</h2>

      {/* Création de partie */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Créer une nouvelle partie</h3>
        {createError && <div className="auth-error">{createError}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Mode&nbsp;
            <select
              value={mode}
              onChange={e => setMode(e.target.value as 'AI_VS_PLAYER' | 'PLAYER_VS_PLAYER')}
            >
              <option value="PLAYER_VS_PLAYER">2 joueurs</option>
              <option value="AI_VS_PLAYER">Contre l'IA</option>
            </select>
          </label>
          <label>
            Mise&nbsp;
            <input
              type="number"
              min={0}
              value={stake}
              onChange={e => setStake(Number(e.target.value) || 0)}
              style={{ width: '6rem' }}
            />
          </label>
          <button className="btn btn-primary" onClick={handleCreateGame} disabled={creating}>
            {creating ? 'Création…' : 'Créer une partie'}
          </button>
        </div>
      </section>

      {/* Liste des parties disponibles */}
      <section>
        <h3>Parties disponibles</h3>
        {loading && <div>Chargement des parties…</div>}
        {error && <div className="auth-error">{error}</div>}

        {!loading && games.length === 0 && !error && (
          <div>Aucune partie disponible pour le moment.</div>
        )}

        {games.length > 0 && (
          <table className="lobby-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mode</th>
                <th>Mise</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {games.map(game => (
                <tr key={game.id}>
                  <td>{game.id}</td>
                  <td>{game.gameType ?? '-'}</td>
                  <td>{typeof game.stake === 'number' ? game.stake : '-'}</td>
                  <td>{game.status ?? 'waiting'}</td>
                  <td>
                    <button className="btn btn-primary" onClick={() => handleJoin(game.id)}>
                      Rejoindre
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
