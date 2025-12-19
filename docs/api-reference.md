# 📡 API Reference

> Documentation complète de l'API The Brain

## Base URL

```
Production: https://universal-api-hub.fly.dev
Development: http://localhost:8000
```

## Authentication

La plupart des endpoints sont publics. Pour les endpoints protégés, utilisez un header Bearer:

```
Authorization: Bearer YOUR_API_KEY
```

---

## 🔍 Search

### Universal Search
```http
GET /api/search
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | ✅ | Query de recherche |
| `mode` | string | ❌ | `speed`, `balanced`, `deep` |
| `lang` | string | ❌ | Langue (fr, en, he, ar...) |

**Example:**
```bash
curl "https://universal-api-hub.fly.dev/api/search?q=bitcoin%20price&mode=speed"
```

**Response:**
```json
{
  "query": "bitcoin price",
  "mode": "speed",
  "response": "Le Bitcoin est actuellement à $42,500 USD...",
  "sources": [
    {"title": "CoinGecko", "url": "https://coingecko.com"}
  ],
  "processing_time_ms": 1250
}
```

---

## 💬 Chat

### Chat Completion
```http
POST /api/chat
```

**Body:**
```json
{
  "message": "Explique-moi la blockchain",
  "context": [],
  "model": "auto",
  "stream": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ✅ | Message utilisateur |
| `context` | array | ❌ | Historique de conversation |
| `model` | string | ❌ | `auto`, `groq`, `claude`, `gpt` |
| `stream` | boolean | ❌ | Activer le streaming SSE |

**Streaming Response:**
```
data: {"chunk": "La blockchain est"}
data: {"chunk": " une technologie"}
data: {"done": true}
```

---

## 💰 Finance

### Crypto Price
```http
GET /api/finance/crypto/{coin}
```

**Example:**
```bash
curl "https://universal-api-hub.fly.dev/api/finance/crypto/bitcoin"
```

**Response:**
```json
{
  "coin": "bitcoin",
  "price_usd": 42500.50,
  "change_24h": 2.5,
  "market_cap": 850000000000,
  "updated_at": "2025-12-19T09:00:00Z"
}
```

### Stock Quote
```http
GET /api/finance/stock/{symbol}
```

---

## ⛅ Weather

### Current Weather
```http
GET /api/weather/current
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `city` | string | ✅ | Nom de la ville |
| `units` | string | ❌ | `metric`, `imperial` |

**Example:**
```bash
curl "https://universal-api-hub.fly.dev/api/weather/current?city=Paris"
```

---

## 🏥 Health

### Medical Search
```http
GET /api/medical/search
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | ✅ | Query médicale |
| `source` | string | ❌ | `pubmed`, `who`, `all` |

---

## 🎬 Entertainment

### Movie Search
```http
GET /api/entertainment/movies
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | ✅ | Titre du film |
| `year` | int | ❌ | Année de sortie |

### Trending Movies
```http
GET /api/entertainment/trending
```

---

## 📰 News

### Latest News
```http
GET /api/news/latest
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | ❌ | `tech`, `business`, `sports`, `health` |
| `country` | string | ❌ | Code pays (us, fr, il...) |
| `limit` | int | ❌ | Nombre d'articles (max 50) |

---

## 🏀 Sports

### Live Scores
```http
GET /api/sports/live
```

### Team Info
```http
GET /api/sports/team/{team_id}
```

---

## 🌍 Tourism

### Places Nearby
```http
GET /api/tourism/places
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | float | ✅ | Latitude |
| `lon` | float | ✅ | Longitude |
| `radius` | int | ❌ | Rayon en mètres |
| `type` | string | ❌ | `restaurant`, `hotel`, `attraction` |

---

## 🔧 System

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "version": "2.0.0",
  "uptime_seconds": 86400,
  "services": {
    "groq": "ok",
    "redis": "ok",
    "searxng": "ok"
  }
}
```

### API Stats
```http
GET /api/stats
```

---

## 🚨 Error Handling

### Error Response Format
```json
{
  "error": true,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please wait 60 seconds.",
  "retry_after": 60
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_QUERY` | 400 | Query invalide |
| `NOT_FOUND` | 404 | Ressource non trouvée |
| `RATE_LIMIT_EXCEEDED` | 429 | Trop de requêtes |
| `INTERNAL_ERROR` | 500 | Erreur serveur |
| `SERVICE_UNAVAILABLE` | 503 | Service indisponible |

---

## 📊 Rate Limits

| Tier | Requests/min | Requests/day |
|------|--------------|--------------|
| Free | 60 | 1,000 |
| Pro | 300 | 10,000 |
| Enterprise | Unlimited | Unlimited |

---

## 🔗 SDKs & Libraries

### Python
```python
from the_brain import BrainClient

client = BrainClient()
result = client.search("bitcoin price")
print(result.response)
```

### JavaScript
```javascript
import { BrainClient } from 'the-brain-sdk';

const client = new BrainClient();
const result = await client.search('bitcoin price');
console.log(result.response);
```

---

## 📝 Changelog

See [CHANGELOG.md](../CHANGELOG.md) for API version history.
