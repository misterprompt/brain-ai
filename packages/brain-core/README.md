# 🧠 Brain Core

> Le cerveau central avec 200+ APIs et multi-modèles IA

## Structure

```
src/
├── apis/              # 200+ APIs intégrées
│   ├── mega_api_brain.py
│   └── mega_api_registry.py
├── ai/                # Intelligence Artificielle
│   ├── ai_router.py
│   ├── smart_pipeline.py
│   └── smart_search_v7.py
├── cache/             # Cache & Anti-hallucination
│   ├── cache.py
│   └── anti_hallucination.py
└── interfaces/        # 15 Experts spécialisés
    ├── health.py
    ├── finance.py
    └── ...
```

## Installation

```bash
cd packages/brain-core
pip install -r requirements.txt
```

## Usage

```python
from src.apis.mega_api_brain import MegaApiBrain
from src.ai.ai_router import AIRouter

# Initialiser le cerveau
brain = MegaApiBrain()
router = AIRouter()

# Recherche avec IA
result = await brain.search("Bitcoin price today")
response = await router.generate(result)
```

## APIs Disponibles

- 🏥 **Health**: PubMed, OpenFDA, WHO
- 💰 **Finance**: CoinGecko, Alpha Vantage, Yahoo Finance
- 🎬 **Entertainment**: TMDB, RAWG, Spotify
- ⛅ **Weather**: OpenWeatherMap, WeatherAPI
- 📰 **News**: NewsAPI, GNews
- 🏀 **Sports**: ESPN, Football-Data
- 🍔 **Food**: Spoonacular, TheMealDB
- ✈️ **Tourism**: Amadeus, OpenTripMap
- 💻 **Tech**: GitHub, HackerNews
- 📚 **Knowledge**: Wikipedia, Wolfram Alpha
