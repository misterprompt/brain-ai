export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:3000';

function getAuthToken(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem('authToken');
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

async function request<TResponse = unknown>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const url = `${API_BASE_URL}${path}`;

  const headers = new Headers(options.headers ?? {});
  headers.set('Accept', 'application/json');

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal
  });

  const contentType = response.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    if (isJson) {
      try {
        const errorBody = await response.json();
        if (errorBody) {
          if (typeof (errorBody as any).error === 'string') {
            errorMessage = (errorBody as any).error;
          } else if (typeof (errorBody as any).message === 'string') {
            errorMessage = (errorBody as any).message;
          }
        }
      } catch {
        // ignore JSON parsing errors for error responses
      }
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  if (!isJson) {
    return (await response.text()) as unknown as TResponse;
  }

  return (await response.json()) as TResponse;
}

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  username?: string;
  name?: string;
};

export type CreateGamePayload = {
  gameType: string;
  stake: number;
  opponentId?: string | null;
  game_mode?: 'AI_VS_PLAYER' | 'PLAYER_VS_PLAYER';
};

export type MakeMovePayload = {
  from: number;
  to: number;
  diceUsed: number;
};

export const apiClient = {
  login<TResponse = unknown>(payload: LoginPayload, options: { signal?: AbortSignal } = {}) {
    return request<TResponse>('/api/auth/login', {
      method: 'POST',
      body: payload,
      signal: options.signal
    });
  },

  register<TResponse = unknown>(payload: RegisterPayload, options: { signal?: AbortSignal } = {}) {
    return request<TResponse>('/api/auth/register', {
      method: 'POST',
      body: payload,
      signal: options.signal
    });
  },

  getGames<TResponse = unknown>(options: { signal?: AbortSignal } = {}) {
    return request<TResponse>('/api/games', {
      method: 'GET',
      signal: options.signal
    });
  },

  createGame<TResponse = unknown>(payload: CreateGamePayload, options: { signal?: AbortSignal } = {}) {
    return request<TResponse>('/api/games', {
      method: 'POST',
      body: payload,
      signal: options.signal
    });
  },

  makeMove<TResponse = unknown>(gameId: string | number, payload: MakeMovePayload, options: { signal?: AbortSignal } = {}) {
    return request<TResponse>(`/api/games/${gameId}/move`, {
      method: 'POST',
      body: payload,
      signal: options.signal
    });
  },

  getGameStatus<TResponse = unknown>(gameId: string | number, options: { signal?: AbortSignal } = {}) {
    return request<TResponse>(`/api/games/${gameId}/status`, {
      method: 'GET',
      signal: options.signal
    });
  },

  rollDice<TResponse = unknown>(gameId: string | number, options: { signal?: AbortSignal } = {}) {
    return request<TResponse>(`/api/games/${gameId}/roll`, {
      method: 'POST',
      signal: options.signal
    });
  },

  getAvailableGames<TResponse = unknown>(options: { signal?: AbortSignal } = {}) {
    return request<TResponse>('/api/games/available', {
      method: 'GET',
      signal: options.signal
    });
  },

  joinGame<TResponse = unknown>(gameId: string | number, options: { signal?: AbortSignal } = {}) {
    return request<TResponse>(`/api/games/${gameId}/join`, {
      method: 'POST',
      signal: options.signal
    });
  },

  getSuggestions<TResponse = unknown>(
    gameId: string | number,
    payload?: { boardState?: unknown; dice?: unknown },
    options: { signal?: AbortSignal } = {}
  ) {
    return request<TResponse>(`/api/games/${gameId}/suggestions`, {
      method: 'POST',
      body: payload,
      signal: options.signal
    });
  },

  evaluatePosition<TResponse = unknown>(
    gameId: string | number,
    payload?: { boardState?: unknown; dice?: unknown },
    options: { signal?: AbortSignal } = {}
  ) {
    return request<TResponse>(`/api/games/${gameId}/evaluate`, {
      method: 'POST',
      body: payload,
      signal: options.signal
    });
  },

  offerDouble<TResponse = unknown>(gameId: string | number, options: { signal?: AbortSignal } = {}) {
    return request<TResponse>(`/api/games/${gameId}/double`, {
      method: 'POST',
      signal: options.signal
    });
  },

  respondToDouble<TResponse = unknown>(gameId: string | number, accept: boolean, beaver: boolean = false, raccoon: boolean = false, options: { signal?: AbortSignal } = {}) {
    return request<TResponse>(`/api/games/${gameId}/double/respond`, {
      method: 'POST',
      body: { accept, beaver, raccoon },
      signal: options.signal
    });
  }
};

export type ApiClient = typeof apiClient;
