import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Options de test : ~20 VUs pendant 1 minute par défaut
// Ajuste VUs/duration ou utilise des "stages" selon tes besoins.
export const options = {
  vus: Number(__ENV.VUS || 20),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% des requêtes HTTP < 800ms
    http_req_failed: ['rate<0.05']    // < 5% d'erreurs HTTP
  }
};

// Base URL de l'API (par défaut backend local)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Jeton d'auth facultatif pour tester les endpoints protégés
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const createGameDuration = new Trend('http_create_game_duration');
const moveDuration = new Trend('http_move_duration');
const wsConnectDuration = new Trend('ws_connect_duration');
const wsErrors = new Counter('ws_errors');

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) {
    headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
}

function createGame() {
  const payload = JSON.stringify({
    game_mode: 'AI_VS_PLAYER',
    stake: 0
  });

  const res = http.post(`${BASE_URL}/api/games`, payload, { headers: buildHeaders() });
  createGameDuration.add(res.timings.duration);

  check(res, {
    'createGame status 2xx': r => r.status >= 200 && r.status < 300
  });

  let gameId = null;
  try {
    const body = res.json();
    // Supporte différents wrappers { id }, { data: { id } }, { data: { game: { id } } }
    gameId = body?.id || body?.data?.id || body?.data?.game?.id || null;
  } catch (e) {
    // ignore parsing errors, metrics/counters suffisent
  }

  return gameId;
}

function makeMove(gameId) {
  if (!gameId) return;

  const payload = JSON.stringify({
    from: 0,
    to: 1,
    diceUsed: 1
  });

  const res = http.post(`${BASE_URL}/api/games/${gameId}/move`, payload, {
    headers: buildHeaders()
  });

  moveDuration.add(res.timings.duration);

  check(res, {
    'makeMove status 2xx/4xx': r => (r.status >= 200 && r.status < 300) || (r.status >= 400 && r.status < 500)
  });
}

function testWebSocket(gameId) {
  if (!gameId) return;

  const wsBase = BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  const url = `${wsBase}/ws/game?gameId=${encodeURIComponent(String(gameId))}`;

  ws.connect(url, { headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {} }, socket => {
    const start = Date.now();

    socket.on('open', () => {
      wsConnectDuration.add(Date.now() - start);
    });

    socket.on('error', (e) => {
      wsErrors.add(1);
    });

    // Écouter quelques messages puis fermer
    socket.on('message', () => {
      // On pourrait compter les messages ou inspecter le contenu ici
    });

    socket.setTimeout(() => {
      socket.close();
    }, 3000);
  });
}

export default function () {
  group('game flow', () => {
    const gameId = createGame();
    makeMove(gameId);
    testWebSocket(gameId);
  });

  // Petite pause entre les itérations pour éviter un martelage extrême
  sleep(1);
}
