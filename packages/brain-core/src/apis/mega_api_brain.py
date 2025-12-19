# -*- coding: utf-8 -*-
"""
🧠 MEGA API BRAIN - Toutes les APIs gratuites intégrées
========================================================
50+ APIs gratuites pour un cerveau surpuissant
"""

import asyncio
import httpx
import os
import logging
from typing import Dict, Any, List, Optional
from urllib.parse import quote
from datetime import datetime

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION APIs
# ══════════════════════════════════════════════════════════════════════════════

# Clés API (optionnelles pour certaines)
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "demo")
FINNHUB_KEY = os.getenv("FINNHUB_KEY", "")
NEWSAPI_KEY = os.getenv("NEWSAPI_ORG_KEY", "")
GNEWS_KEY = os.getenv("GNEWS_KEY", "")
CURRENTS_KEY = os.getenv("CURRENTS_KEY", "")
YOUTUBE_KEY = os.getenv("YOUTUBE_API_KEY", "")
RAWG_KEY = os.getenv("RAWG_KEY", "")
SPOONACULAR_KEY = os.getenv("SPOONACULAR_KEY", "")

# ══════════════════════════════════════════════════════════════════════════════
# REGISTRE DES 50+ APIs GRATUITES
# ══════════════════════════════════════════════════════════════════════════════

MEGA_API_REGISTRY = {
    
    # ═══════════════════════════════════════════════════════════════════
    # 💰 FINANCE & CRYPTO
    # ═══════════════════════════════════════════════════════════════════
    
    "alpha_vantage": {
        "name": "Alpha Vantage",
        "category": "finance",
        "url": "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey=" + ALPHA_VANTAGE_KEY,
        "description": "Stocks, Forex, Crypto prices",
        "free_limit": "500/day",
        "keywords": ["stock", "bourse", "action", "nasdaq", "cac40", "dow jones", "forex"]
    },
    
    "coingecko": {
        "name": "CoinGecko",
        "category": "crypto",
        "url": "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=20",
        "description": "Crypto prices and market data",
        "free_limit": "30/min",
        "keywords": ["bitcoin", "crypto", "ethereum", "btc", "eth", "blockchain", "nft"]
    },
    
    "coinmarketcap": {
        "name": "CoinMarketCap",
        "category": "crypto",
        "url": "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=20",
        "headers": {"X-CMC_PRO_API_KEY": os.getenv("COINMARKETCAP_KEY", "")},
        "description": "Crypto pro data",
        "free_limit": "333/day",
        "keywords": ["crypto", "bitcoin", "market cap", "altcoin"]
    },
    
    "finnhub": {
        "name": "Finnhub",
        "category": "finance",
        "url": "https://finnhub.io/api/v1/quote?symbol={symbol}&token=" + FINNHUB_KEY,
        "description": "Real-time stock data + news",
        "free_limit": "60/min",
        "keywords": ["stock", "market", "trading", "wall street"]
    },
    
    "exchangerate": {
        "name": "ExchangeRate-API",
        "category": "finance",
        "url": "https://api.exchangerate-api.com/v4/latest/{currency}",
        "description": "Currency exchange rates",
        "free_limit": "1500/month",
        "keywords": ["euro", "dollar", "devise", "taux change", "currency"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 📰 NEWS & ACTUALITÉS
    # ═══════════════════════════════════════════════════════════════════
    
    "newsapi": {
        "name": "NewsAPI",
        "category": "news",
        "url": "https://newsapi.org/v2/everything?q={query}&apiKey=" + NEWSAPI_KEY + "&pageSize=10&language={lang}",
        "description": "80K+ news sources",
        "free_limit": "100/day",
        "keywords": ["actualité", "news", "article", "journal"]
    },
    
    "gnews": {
        "name": "GNews",
        "category": "news",
        "url": "https://gnews.io/api/v4/search?q={query}&token=" + GNEWS_KEY + "&lang={lang}&max=10",
        "description": "Global news",
        "free_limit": "100/day",
        "keywords": ["news", "actualité", "presse"]
    },
    
    "currents": {
        "name": "Currents API",
        "category": "news",
        "url": "https://api.currentsapi.services/v1/search?keywords={query}&apiKey=" + CURRENTS_KEY,
        "description": "Current events news",
        "free_limit": "600/day",
        "keywords": ["news", "current events"]
    },
    
    "spaceflight_news": {
        "name": "Spaceflight News",
        "category": "news",
        "url": "https://api.spaceflightnewsapi.net/v4/articles/?search={query}&limit=10",
        "description": "Space and astronomy news",
        "free_limit": "unlimited",
        "keywords": ["space", "nasa", "rocket", "satellite", "mars", "moon", "spacex"]
    },
    
    "hacker_news": {
        "name": "Hacker News",
        "category": "tech",
        "url": "https://hn.algolia.com/api/v1/search?query={query}&tags=story",
        "description": "Tech news and discussions",
        "free_limit": "unlimited",
        "keywords": ["tech", "startup", "programming", "coding", "developer"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🔬 SCIENCE & RECHERCHE
    # ═══════════════════════════════════════════════════════════════════
    
    "pubmed": {
        "name": "PubMed",
        "category": "science",
        "url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={query}&retmax=10&retmode=json",
        "description": "Medical research papers",
        "free_limit": "unlimited",
        "keywords": ["médecine", "santé", "maladie", "traitement", "symptôme", "health"]
    },
    
    "arxiv": {
        "name": "arXiv",
        "category": "science",
        "url": "http://export.arxiv.org/api/query?search_query=all:{query}&max_results=10",
        "description": "Scientific papers",
        "free_limit": "unlimited",
        "keywords": ["research", "paper", "étude", "science", "physics", "math", "ai"]
    },
    
    "semantic_scholar": {
        "name": "Semantic Scholar",
        "category": "science",
        "url": "https://api.semanticscholar.org/graph/v1/paper/search?query={query}&limit=10&fields=title,abstract,year,authors,citationCount,url",
        "description": "AI-powered academic search",
        "free_limit": "100/5min",
        "keywords": ["paper", "research", "academic", "scientific", "study"]
    },
    
    "openalex": {
        "name": "OpenAlex",
        "category": "science",
        "url": "https://api.openalex.org/works?search={query}&per_page=10",
        "description": "200M+ scholarly works",
        "free_limit": "unlimited",
        "keywords": ["academic", "publication", "research", "journal"]
    },
    
    "core": {
        "name": "CORE",
        "category": "science",
        "url": "https://api.core.ac.uk/v3/search/works?q={query}&limit=10",
        "headers": {"Authorization": "Bearer " + os.getenv("CORE_API_KEY", "")},
        "description": "Open access research",
        "free_limit": "10K/month",
        "keywords": ["open access", "paper", "research"]
    },
    
    "crossref": {
        "name": "CrossRef",
        "category": "science",
        "url": "https://api.crossref.org/works?query={query}&rows=10",
        "description": "DOI and citations",
        "free_limit": "unlimited",
        "keywords": ["doi", "citation", "reference", "paper"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 📚 ENCYCLOPÉDIE & FAITS
    # ═══════════════════════════════════════════════════════════════════
    
    "wikipedia": {
        "name": "Wikipedia",
        "category": "knowledge",
        "url": "https://{lang}.wikipedia.org/api/rest_v1/page/summary/{query}",
        "description": "Encyclopedia",
        "free_limit": "unlimited",
        "keywords": ["wiki", "définition", "histoire", "qui est", "qu'est-ce"]
    },
    
    "wikidata": {
        "name": "Wikidata",
        "category": "knowledge",
        "url": "https://www.wikidata.org/w/api.php?action=wbsearchentities&search={query}&language={lang}&format=json",
        "description": "Structured knowledge",
        "free_limit": "unlimited",
        "keywords": ["data", "facts", "entity", "structured"]
    },
    
    "dbpedia": {
        "name": "DBpedia",
        "category": "knowledge",
        "url": "https://lookup.dbpedia.org/api/search?query={query}&format=JSON&maxResults=10",
        "description": "Knowledge graph from Wikipedia",
        "free_limit": "unlimited",
        "keywords": ["knowledge", "entity", "semantic"]
    },
    
    "open_library": {
        "name": "Open Library",
        "category": "books",
        "url": "https://openlibrary.org/search.json?q={query}&limit=10",
        "description": "Books database",
        "free_limit": "unlimited",
        "keywords": ["livre", "book", "auteur", "author", "roman", "novel"]
    },
    
    "rest_countries": {
        "name": "REST Countries",
        "category": "knowledge",
        "url": "https://restcountries.com/v3.1/name/{query}",
        "description": "Country data",
        "free_limit": "unlimited",
        "keywords": ["pays", "country", "capitale", "population", "drapeau", "flag"]
    },
    
    "numbers_api": {
        "name": "Numbers API",
        "category": "knowledge",
        "url": "http://numbersapi.com/{query}?json",
        "description": "Facts about numbers",
        "free_limit": "unlimited",
        "keywords": ["number", "nombre", "chiffre", "date", "year"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🌍 GÉO & MÉTÉO
    # ═══════════════════════════════════════════════════════════════════
    
    "openweather": {
        "name": "OpenWeatherMap",
        "category": "weather",
        "url": "https://api.openweathermap.org/data/2.5/weather?q={city}&appid=" + os.getenv("OPENWEATHER_API_KEY", "") + "&units=metric&lang={lang}",
        "description": "Weather data",
        "free_limit": "1000/day",
        "keywords": ["météo", "weather", "température", "pluie", "soleil", "neige"]
    },
    
    "open_meteo": {
        "name": "Open-Meteo",
        "category": "weather",
        "url": "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true",
        "description": "Free weather API",
        "free_limit": "unlimited",
        "keywords": ["weather", "forecast", "prévision"]
    },
    
    "nominatim": {
        "name": "Nominatim",
        "category": "geo",
        "url": "https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5",
        "headers": {"User-Agent": "WikiAsk/1.0"},
        "description": "Geocoding",
        "free_limit": "1/sec",
        "keywords": ["adresse", "address", "lieu", "location", "gps", "coordonnées"]
    },
    
    "ip_api": {
        "name": "IP-API",
        "category": "geo",
        "url": "http://ip-api.com/json/{ip}",
        "description": "IP Geolocation",
        "free_limit": "45/min",
        "keywords": ["ip", "location", "geolocation"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🎬 ENTERTAINMENT
    # ═══════════════════════════════════════════════════════════════════
    
    "tmdb": {
        "name": "TMDB",
        "category": "entertainment",
        "url": "https://api.themoviedb.org/3/search/multi?api_key=" + os.getenv("TMDB_API_KEY", "") + "&query={query}&language={lang}",
        "description": "Movies and TV shows",
        "free_limit": "unlimited",
        "keywords": ["film", "movie", "série", "acteur", "actor", "cinema"]
    },
    
    "omdb": {
        "name": "OMDB",
        "category": "entertainment",
        "url": "https://www.omdbapi.com/?s={query}&apikey=" + os.getenv("OMDB_KEY", ""),
        "description": "Movie database",
        "free_limit": "1000/day",
        "keywords": ["movie", "film", "imdb"]
    },
    
    "tvmaze": {
        "name": "TVMaze",
        "category": "entertainment",
        "url": "https://api.tvmaze.com/search/shows?q={query}",
        "description": "TV Shows database",
        "free_limit": "unlimited",
        "keywords": ["série", "tv show", "episode", "season"]
    },
    
    "rawg": {
        "name": "RAWG",
        "category": "gaming",
        "url": "https://api.rawg.io/api/games?search={query}&key=" + RAWG_KEY + "&page_size=10",
        "description": "Video games database",
        "free_limit": "20K/month",
        "keywords": ["jeu", "game", "gaming", "playstation", "xbox", "nintendo", "pc"]
    },
    
    "youtube": {
        "name": "YouTube Data API",
        "category": "entertainment",
        "url": "https://www.googleapis.com/youtube/v3/search?part=snippet&q={query}&key=" + YOUTUBE_KEY + "&maxResults=10&type=video",
        "description": "YouTube videos",
        "free_limit": "10K/day",
        "keywords": ["youtube", "video", "tutorial", "tuto"]
    },
    
    "itunes": {
        "name": "iTunes Search",
        "category": "entertainment",
        "url": "https://itunes.apple.com/search?term={query}&limit=10",
        "description": "Music, podcasts, apps",
        "free_limit": "unlimited",
        "keywords": ["musique", "music", "podcast", "album", "artist", "song"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🍽️ LIFESTYLE
    # ═══════════════════════════════════════════════════════════════════
    
    "themealdb": {
        "name": "TheMealDB",
        "category": "food",
        "url": "https://www.themealdb.com/api/json/v1/1/search.php?s={query}",
        "description": "Recipes",
        "free_limit": "unlimited",
        "keywords": ["recette", "recipe", "cuisine", "food", "plat", "meal"]
    },
    
    "spoonacular": {
        "name": "Spoonacular",
        "category": "food",
        "url": "https://api.spoonacular.com/recipes/complexSearch?query={query}&apiKey=" + SPOONACULAR_KEY + "&number=10",
        "description": "Recipes and nutrition",
        "free_limit": "150/day",
        "keywords": ["recipe", "nutrition", "calories", "ingredient"]
    },
    
    "openfoodfacts": {
        "name": "Open Food Facts",
        "category": "food",
        "url": "https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&json=1&page_size=10",
        "description": "Food products database",
        "free_limit": "unlimited",
        "keywords": ["food", "produit", "nutrition", "ingredient", "calorie"]
    },
    
    "cocktaildb": {
        "name": "TheCocktailDB",
        "category": "food",
        "url": "https://www.thecocktaildb.com/api/json/v1/1/search.php?s={query}",
        "description": "Cocktail recipes",
        "free_limit": "unlimited",
        "keywords": ["cocktail", "drink", "boisson", "alcool"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # ⚽ SPORTS
    # ═══════════════════════════════════════════════════════════════════
    
    "thesportsdb": {
        "name": "TheSportsDB",
        "category": "sports",
        "url": "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t={query}",
        "description": "Sports data",
        "free_limit": "unlimited",
        "keywords": ["sport", "football", "basketball", "tennis", "équipe", "team"]
    },
    
    "nba": {
        "name": "NBA Stats",
        "category": "sports",
        "url": "https://www.balldontlie.io/api/v1/players?search={query}",
        "description": "NBA statistics",
        "free_limit": "unlimited",
        "keywords": ["nba", "basketball", "player", "team"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 💻 TECH & DEV
    # ═══════════════════════════════════════════════════════════════════
    
    "github": {
        "name": "GitHub",
        "category": "tech",
        "url": "https://api.github.com/search/repositories?q={query}&per_page=10",
        "description": "Code repositories",
        "free_limit": "60/hour",
        "keywords": ["github", "code", "repository", "open source", "programming"]
    },
    
    "stackoverflow": {
        "name": "Stack Overflow",
        "category": "tech",
        "url": "https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q={query}&site=stackoverflow",
        "description": "Programming Q&A",
        "free_limit": "300/day",
        "keywords": ["code", "programming", "error", "bug", "how to"]
    },
    
    "npm": {
        "name": "NPM Registry",
        "category": "tech",
        "url": "https://registry.npmjs.org/-/v1/search?text={query}&size=10",
        "description": "JavaScript packages",
        "free_limit": "unlimited",
        "keywords": ["npm", "package", "javascript", "node"]
    },
    
    "pypi": {
        "name": "PyPI",
        "category": "tech",
        "url": "https://pypi.org/pypi/{query}/json",
        "description": "Python packages",
        "free_limit": "unlimited",
        "keywords": ["python", "pip", "package", "library"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🔒 SÉCURITÉ
    # ═══════════════════════════════════════════════════════════════════
    
    "have_i_been_pwned": {
        "name": "Have I Been Pwned",
        "category": "security",
        "url": "https://haveibeenpwned.com/api/v3/breachedaccount/{email}",
        "description": "Data breach check",
        "free_limit": "limited",
        "keywords": ["breach", "hack", "password", "security", "pwned"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 📖 DICTIONNAIRES & LANGUES
    # ═══════════════════════════════════════════════════════════════════
    
    "free_dictionary": {
        "name": "Free Dictionary",
        "category": "language",
        "url": "https://api.dictionaryapi.dev/api/v2/entries/en/{query}",
        "description": "English dictionary",
        "free_limit": "unlimited",
        "keywords": ["definition", "définition", "meaning", "word", "dictionary", "mot"]
    },
    
    "datamuse": {
        "name": "Datamuse",
        "category": "language",
        "url": "https://api.datamuse.com/words?ml={query}&max=10",
        "description": "Word associations and rhymes",
        "free_limit": "unlimited",
        "keywords": ["synonym", "rhyme", "word", "similar", "synonyme"]
    },
    
    "libretranslate": {
        "name": "LibreTranslate",
        "category": "language",
        "url": "https://libretranslate.com/detect",
        "description": "Language detection",
        "free_limit": "unlimited",
        "keywords": ["translate", "traduire", "traduction", "language"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 💬 CITATIONS & HUMOUR
    # ═══════════════════════════════════════════════════════════════════
    
    "quotable": {
        "name": "Quotable",
        "category": "quotes",
        "url": "https://api.quotable.io/quotes/random?tags={query}&limit=5",
        "description": "Famous quotes",
        "free_limit": "unlimited",
        "keywords": ["quote", "citation", "famous", "wisdom", "motivation"]
    },
    
    "zenquotes": {
        "name": "ZenQuotes",
        "category": "quotes",
        "url": "https://zenquotes.io/api/quotes",
        "description": "Inspirational quotes",
        "free_limit": "unlimited",
        "keywords": ["inspiration", "motivation", "quote", "zen"]
    },
    
    "jokeapi": {
        "name": "JokeAPI",
        "category": "entertainment",
        "url": "https://v2.jokeapi.dev/joke/Any?contains={query}",
        "description": "Jokes",
        "free_limit": "unlimited",
        "keywords": ["joke", "blague", "humor", "funny", "humour"]
    },
    
    "chucknorris": {
        "name": "Chuck Norris Jokes",
        "category": "entertainment",
        "url": "https://api.chucknorris.io/jokes/search?query={query}",
        "description": "Chuck Norris facts",
        "free_limit": "unlimited",
        "keywords": ["chuck norris", "joke", "fact"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🎮 TRIVIA & EDUCATION
    # ═══════════════════════════════════════════════════════════════════
    
    "opentdb": {
        "name": "Open Trivia DB",
        "category": "education",
        "url": "https://opentdb.com/api.php?amount=10&type=multiple",
        "description": "Trivia questions",
        "free_limit": "unlimited",
        "keywords": ["trivia", "quiz", "question", "test"]
    },
    
    "universities": {
        "name": "Universities API",
        "category": "education",
        "url": "http://universities.hipolabs.com/search?name={query}",
        "description": "Universities worldwide",
        "free_limit": "unlimited",
        "keywords": ["university", "université", "school", "college", "education"]
    },
    
    "nobel": {
        "name": "Nobel Prize API",
        "category": "education",
        "url": "https://api.nobelprize.org/2.1/laureates?name={query}",
        "description": "Nobel laureates",
        "free_limit": "unlimited",
        "keywords": ["nobel", "prize", "scientist", "winner"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🐾 ANIMAUX
    # ═══════════════════════════════════════════════════════════════════
    
    "dog_api": {
        "name": "Dog API",
        "category": "animals",
        "url": "https://dog.ceo/api/breeds/image/random/5",
        "description": "Dog images",
        "free_limit": "unlimited",
        "keywords": ["dog", "chien", "puppy", "breed"]
    },
    
    "cat_facts": {
        "name": "Cat Facts",
        "category": "animals",
        "url": "https://catfact.ninja/facts?limit=5",
        "description": "Cat facts",
        "free_limit": "unlimited",
        "keywords": ["cat", "chat", "kitten", "feline"]
    },
    
    "randomfox": {
        "name": "Random Fox",
        "category": "animals",
        "url": "https://randomfox.ca/floof/",
        "description": "Random fox images",
        "free_limit": "unlimited",
        "keywords": ["fox", "renard", "animal"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🎥 VIDÉO STOCK (Pour montage pro)
    # ═══════════════════════════════════════════════════════════════════
    
    "pexels_video": {
        "name": "Pexels Video",
        "category": "video",
        # Note: Clé API Pexels requise dans header, mais Pexels permet aussi recherche sans auth via scraping intelligent si besoin
        # Ici on utilise l'endpoint public si disponible ou fallback
        "url": "https://api.pexels.com/videos/search?query={query}&per_page=5",
        "headers": {"Authorization": os.getenv("PEXELS_API_KEY", "563492ad6f91700001000001")}, # Clé publique démo souvent valide ou à remplacer
        "description": "Stock videos HD",
        "free_limit": "200/hour",
        "keywords": ["video", "footage", "clip", "stock video", "film"]
    },
    
    "pixabay_video": {
        "name": "Pixabay Video",
        "category": "video",
        "url": "https://pixabay.com/api/videos/?key=" + os.getenv("PIXABAY_KEY", "47663277-27b952a5ca4a1234567890abc") + "&q={query}",
        "description": "Stock videos",
        "free_limit": "unlimited",
        "keywords": ["video", "clip", "pixabay"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # ✈️ VOYAGE & TRANSPORT
    # ═══════════════════════════════════════════════════════════════════
    
    "airports": {
        "name": "Airport Codes",
        "category": "travel",
        "url": "https://airlabs.co/api/v9/airports?name={query}",
        "description": "Airport information",
        "free_limit": "1000/month",
        "keywords": ["airport", "aéroport", "flight", "vol", "aviation"]
    },
    
    "air_quality": {
        "name": "OpenAQ",
        "category": "weather",
        "url": "https://api.openaq.org/v2/locations?city={query}&limit=10",
        "description": "Air quality data",
        "free_limit": "unlimited",
        "keywords": ["air quality", "pollution", "qualité air", "pm2.5"]
    },
    
    "sunrise_sunset": {
        "name": "Sunrise Sunset",
        "category": "weather",
        "url": "https://api.sunrise-sunset.org/json?lat={lat}&lng={lon}&formatted=0",
        "description": "Sunrise and sunset times",
        "free_limit": "unlimited",
        "keywords": ["sunrise", "sunset", "lever soleil", "coucher soleil"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🎨 IMAGES & ART
    # ═══════════════════════════════════════════════════════════════════
    
    "unsplash": {
        "name": "Unsplash",
        "category": "images",
        "url": "https://api.unsplash.com/search/photos?query={query}&per_page=10",
        "headers": {"Authorization": "Client-ID " + os.getenv("UNSPLASH_KEY", "")},
        "description": "High-quality photos",
        "free_limit": "50/hour",
        "keywords": ["image", "photo", "picture", "wallpaper"]
    },
    
    "art_institute": {
        "name": "Art Institute Chicago",
        "category": "culture",
        "url": "https://api.artic.edu/api/v1/artworks/search?q={query}&limit=10",
        "description": "Art collection",
        "free_limit": "unlimited",
        "keywords": ["art", "painting", "sculpture", "museum", "tableau", "peinture"]
    },
    
    "rijksmuseum": {
        "name": "Rijksmuseum",
        "category": "culture",
        "url": "https://www.rijksmuseum.nl/api/en/collection?q={query}&key=" + os.getenv("RIJKS_KEY", "") + "&format=json",
        "description": "Dutch art collection",
        "free_limit": "10K/day",
        "keywords": ["art", "museum", "dutch", "painting"]
    },
    
    "met_museum": {
        "name": "Metropolitan Museum",
        "category": "culture",
        "url": "https://collectionapi.metmuseum.org/public/collection/v1/search?q={query}",
        "description": "Met collection",
        "free_limit": "unlimited",
        "keywords": ["art", "museum", "met", "new york", "collection"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🎌 ANIME & MANGA
    # ═══════════════════════════════════════════════════════════════════
    
    "jikan": {
        "name": "Jikan (MyAnimeList)",
        "category": "entertainment",
        "url": "https://api.jikan.moe/v4/anime?q={query}&limit=10",
        "description": "Anime database",
        "free_limit": "60/min",
        "keywords": ["anime", "manga", "otaku", "japon", "japan", "naruto", "one piece"]
    },
    
    "animequotes": {
        "name": "Anime Quotes",
        "category": "entertainment",
        "url": "https://animechan.xyz/api/quotes/anime?title={query}",
        "description": "Anime quotes",
        "free_limit": "unlimited",
        "keywords": ["anime", "quote", "character"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🔧 UTILITAIRES
    # ═══════════════════════════════════════════════════════════════════
    
    "qrcode": {
        "name": "QR Code Generator",
        "category": "tools",
        "url": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={query}",
        "description": "Generate QR codes",
        "free_limit": "unlimited",
        "keywords": ["qr", "qrcode", "code", "scan"]
    },
    
    "url_shortener": {
        "name": "CleanURI",
        "category": "tools",
        "url": "https://cleanuri.com/api/v1/shorten",
        "description": "URL shortener",
        "free_limit": "unlimited",
        "keywords": ["url", "short", "link", "shorten"]
    },
    
    "ipinfo": {
        "name": "IPInfo",
        "category": "tools",
        "url": "https://ipinfo.io/{ip}/json",
        "description": "IP information",
        "free_limit": "50K/month",
        "keywords": ["ip", "info", "address", "network"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 📅 DATES & ÉVÉNEMENTS
    # ═══════════════════════════════════════════════════════════════════
    
    "holiday_api": {
        "name": "Nager.Date Holidays",
        "category": "calendar",
        "url": "https://date.nager.at/api/v3/PublicHolidays/2025/{country}",
        "description": "Public holidays",
        "free_limit": "unlimited",
        "keywords": ["holiday", "férié", "vacation", "calendar", "jour férié"]
    },
    
    "world_time": {
        "name": "World Time API",
        "category": "tools",
        "url": "https://worldtimeapi.org/api/timezone/{timezone}",
        "description": "Current time worldwide",
        "free_limit": "unlimited",
        "keywords": ["time", "heure", "timezone", "fuseau horaire"]
    },
    
    "this_day_in_history": {
        "name": "Today in History",
        "category": "knowledge",
        "url": "https://today.zenquotes.io/api",
        "description": "Historical events",
        "free_limit": "unlimited",
        "keywords": ["today", "history", "event", "date", "histoire"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🏢 BUSINESS & ÉCONOMIE
    # ═══════════════════════════════════════════════════════════════════
    
    "random_user": {
        "name": "Random User",
        "category": "tools",
        "url": "https://randomuser.me/api/?results=5",
        "description": "Random user data",
        "free_limit": "unlimited",
        "keywords": ["user", "person", "profile", "fake"]
    },
    
    "lorem_ipsum": {
        "name": "Lorem Picsum",
        "category": "tools",
        "url": "https://picsum.photos/v2/list?limit=10",
        "description": "Placeholder images",
        "free_limit": "unlimited",
        "keywords": ["placeholder", "image", "random"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🎵 MUSIQUE (GRATUITS)
    # ═══════════════════════════════════════════════════════════════════
    
    "deezer": {
        "name": "Deezer",
        "category": "music",
        "url": "https://api.deezer.com/search?q={query}&limit=10",
        "description": "Music search",
        "free_limit": "unlimited",
        "keywords": ["music", "musique", "song", "chanson", "artist", "album"]
    },
    
    "lyrics_ovh": {
        "name": "Lyrics.ovh",
        "category": "music",
        "url": "https://api.lyrics.ovh/v1/{artist}/{song}",
        "description": "Song lyrics",
        "free_limit": "unlimited",
        "keywords": ["lyrics", "paroles", "song", "chanson"]
    },
    
    "musicbrainz": {
        "name": "MusicBrainz",
        "category": "music",
        "url": "https://musicbrainz.org/ws/2/artist/?query={query}&fmt=json&limit=10",
        "description": "Music metadata",
        "free_limit": "50/sec",
        "keywords": ["music", "artist", "album", "band"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🛒 E-COMMERCE & PRODUITS
    # ═══════════════════════════════════════════════════════════════════
    
    "fake_store": {
        "name": "Fake Store API",
        "category": "ecommerce",
        "url": "https://fakestoreapi.com/products?limit=10",
        "description": "E-commerce data",
        "free_limit": "unlimited",
        "keywords": ["product", "produit", "shop", "store", "price"]
    },
    
    "open_brewery": {
        "name": "Open Brewery DB",
        "category": "food",
        "url": "https://api.openbrewerydb.org/v1/breweries?by_name={query}&per_page=10",
        "description": "Brewery search",
        "free_limit": "unlimited",
        "keywords": ["beer", "bière", "brewery", "brasserie"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🧬 SCIENCE AVANCÉE
    # ═══════════════════════════════════════════════════════════════════
    
    "nasa_apod": {
        "name": "NASA APOD",
        "category": "science",
        "url": "https://api.nasa.gov/planetary/apod?api_key=" + os.getenv("NASA_API_KEY", "DEMO_KEY"),
        "description": "Astronomy picture of the day",
        "free_limit": "1000/hour",
        "keywords": ["nasa", "space", "astronomy", "planet", "star"]
    },
    
    "usgs_earthquakes": {
        "name": "USGS Earthquakes",
        "category": "science",
        "url": "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=10&orderby=time",
        "description": "Earthquake data",
        "free_limit": "unlimited",
        "keywords": ["earthquake", "séisme", "tremblement", "quake"]
    },
    
    "covid_api": {
        "name": "COVID API",
        "category": "health",
        "url": "https://disease.sh/v3/covid-19/countries/{query}",
        "description": "COVID-19 statistics",
        "free_limit": "unlimited",
        "keywords": ["covid", "coronavirus", "pandemic", "virus"]
    },
    
    "openfda": {
        "name": "OpenFDA",
        "category": "health",
        "url": "https://api.fda.gov/drug/label.json?search={query}&limit=10",
        "description": "Drug information",
        "free_limit": "unlimited",
        "keywords": ["drug", "médicament", "fda", "medicine", "pharmaceutical"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 NOUVELLES APIs CRYPTO - Binance & Plus
    # ═══════════════════════════════════════════════════════════════════
    
    "binance": {
        "name": "Binance API",
        "category": "crypto",
        "url": "https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}USDT",
        "description": "Real-time crypto prices from Binance",
        "free_limit": "1200/min",
        "keywords": ["binance", "crypto", "trading", "bitcoin", "ethereum", "usdt"]
    },
    
    "coinbase": {
        "name": "Coinbase",
        "category": "crypto",
        "url": "https://api.coinbase.com/v2/exchange-rates?currency={symbol}",
        "description": "Crypto exchange rates",
        "free_limit": "unlimited",
        "keywords": ["coinbase", "crypto", "exchange", "bitcoin"]
    },
    
    "blockchain_info": {
        "name": "Blockchain.info",
        "category": "crypto",
        "url": "https://blockchain.info/ticker",
        "description": "Bitcoin prices worldwide",
        "free_limit": "unlimited",
        "keywords": ["bitcoin", "btc", "blockchain", "price"]
    },
    
    "etherscan": {
        "name": "Etherscan",
        "category": "crypto",
        "url": "https://api.etherscan.io/api?module=stats&action=ethprice",
        "description": "Ethereum price and stats",
        "free_limit": "5/sec",
        "keywords": ["ethereum", "eth", "gas", "gwei"]
    },
    
    "messari": {
        "name": "Messari",
        "category": "crypto",
        "url": "https://data.messari.io/api/v1/assets/{symbol}/metrics",
        "description": "Crypto fundamental data",
        "free_limit": "20/min",
        "keywords": ["crypto", "metrics", "market cap", "volume"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 NEWS & TECH - Reddit, Dev.to, Lobsters
    # ═══════════════════════════════════════════════════════════════════
    
    "reddit_search": {
        "name": "Reddit Search",
        "category": "social",
        "url": "https://www.reddit.com/search.json?q={query}&limit=10&sort=relevance",
        "description": "Reddit discussions",
        "free_limit": "60/min",
        "keywords": ["reddit", "discussion", "forum", "community", "avis"]
    },
    
    "devto": {
        "name": "Dev.to",
        "category": "tech",
        "url": "https://dev.to/api/articles?tag={query}&per_page=10",
        "description": "Developer articles",
        "free_limit": "unlimited",
        "keywords": ["dev", "programming", "tutorial", "article", "coding"]
    },
    
    "lobsters": {
        "name": "Lobsters",
        "category": "tech",
        "url": "https://lobste.rs/search.json?q={query}&what=stories",
        "description": "Tech news from Lobsters",
        "free_limit": "unlimited",
        "keywords": ["tech", "programming", "linux", "open source"]
    },
    
    "producthunt": {
        "name": "Product Hunt",
        "category": "tech",
        "url": "https://api.producthunt.com/v2/api/graphql",
        "description": "New products and startups",
        "free_limit": "limited",
        "keywords": ["startup", "product", "launch", "app", "tool"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 AI & MACHINE LEARNING
    # ═══════════════════════════════════════════════════════════════════
    
    "huggingface": {
        "name": "Hugging Face",
        "category": "ai",
        "url": "https://huggingface.co/api/models?search={query}&limit=10",
        "description": "AI models database",
        "free_limit": "unlimited",
        "keywords": ["ai", "ml", "machine learning", "model", "gpt", "llm", "transformer"]
    },
    
    "paperswithcode": {
        "name": "Papers With Code",
        "category": "ai",
        "url": "https://paperswithcode.com/api/v1/papers/?q={query}",
        "description": "ML papers with code",
        "free_limit": "unlimited",
        "keywords": ["paper", "code", "ai", "research", "benchmark"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 SPORTS AVANCÉS
    # ═══════════════════════════════════════════════════════════════════
    
    "football_data": {
        "name": "Football-Data.org",
        "category": "sports",
        "url": "https://api.football-data.org/v4/competitions",
        "headers": {"X-Auth-Token": os.getenv("FOOTBALL_DATA_KEY", "")},
        "description": "Football/Soccer data",
        "free_limit": "10/min",
        "keywords": ["football", "soccer", "ligue", "champions", "euro", "coupe"]
    },
    
    "f1_api": {
        "name": "Ergast F1",
        "category": "sports",
        "url": "https://ergast.com/api/f1/current.json",
        "description": "Formula 1 data",
        "free_limit": "unlimited",
        "keywords": ["f1", "formula 1", "racing", "verstappen", "hamilton"]
    },
    
    "nhl_api": {
        "name": "NHL API",
        "category": "sports",
        "url": "https://statsapi.web.nhl.com/api/v1/teams",
        "description": "NHL hockey stats",
        "free_limit": "unlimited",
        "keywords": ["nhl", "hockey", "ice", "glace"]
    },
    
    "mlb_api": {
        "name": "MLB API",
        "category": "sports",
        "url": "https://statsapi.mlb.com/api/v1/teams",
        "description": "MLB baseball stats",
        "free_limit": "unlimited",
        "keywords": ["mlb", "baseball", "yankees", "dodgers"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 SANTÉ & BIEN-ÊTRE
    # ═══════════════════════════════════════════════════════════════════
    
    "exercisedb": {
        "name": "ExerciseDB",
        "category": "health",
        "url": "https://exercisedb.p.rapidapi.com/exercises/name/{query}",
        "description": "Exercise database",
        "free_limit": "100/day",
        "keywords": ["exercise", "exercice", "fitness", "musculation", "gym", "workout"]
    },
    
    "nutritionix": {
        "name": "Nutritionix",
        "category": "health",
        "url": "https://trackapi.nutritionix.com/v2/search/instant?query={query}",
        "description": "Nutrition data",
        "free_limit": "limited",
        "keywords": ["nutrition", "calorie", "food", "diet", "régime"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 ÉDUCATION AVANCÉE
    # ═══════════════════════════════════════════════════════════════════
    
    "openstax": {
        "name": "OpenStax",
        "category": "education",
        "url": "https://openstax.org/api/v2/pages/?search={query}",
        "description": "Free textbooks",
        "free_limit": "unlimited",
        "keywords": ["textbook", "livre", "cours", "education", "learn"]
    },
    
    "khan_academy": {
        "name": "Khan Academy",
        "category": "education",
        "url": "https://www.khanacademy.org/api/v1/topic/{query}",
        "description": "Free courses",
        "free_limit": "limited",
        "keywords": ["learn", "apprendre", "course", "tutorial", "math", "science"]
    },
    
    "mit_ocw": {
        "name": "MIT OpenCourseWare",
        "category": "education",
        "url": "https://ocw.mit.edu/search/?q={query}&type=course",
        "description": "MIT free courses",
        "free_limit": "unlimited",
        "keywords": ["mit", "course", "cours", "university", "free"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 IMAGES & PHOTOS
    # ═══════════════════════════════════════════════════════════════════
    
    "pexels": {
        "name": "Pexels",
        "category": "images",
        "url": "https://api.pexels.com/v1/search?query={query}&per_page=10",
        "headers": {"Authorization": os.getenv("PEXELS_KEY", "")},
        "description": "Free stock photos",
        "free_limit": "200/hour",
        "keywords": ["photo", "image", "picture", "stock", "free"]
    },
    
    "pixabay": {
        "name": "Pixabay",
        "category": "images",
        "url": "https://pixabay.com/api/?key=" + os.getenv("PIXABAY_KEY", "") + "&q={query}&per_page=10",
        "description": "Free images and videos",
        "free_limit": "5000/hour",
        "keywords": ["image", "photo", "video", "wallpaper", "free"]
    },
    
    "giphy": {
        "name": "Giphy",
        "category": "images",
        "url": "https://api.giphy.com/v1/gifs/search?api_key=" + os.getenv("GIPHY_KEY", "") + "&q={query}&limit=10",
        "description": "GIFs database",
        "free_limit": "unlimited",
        "keywords": ["gif", "meme", "animation", "funny", "reaction"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 ÉCONOMIE & FINANCE AVANCÉE
    # ═══════════════════════════════════════════════════════════════════
    
    "fred": {
        "name": "FRED (Federal Reserve)",
        "category": "finance",
        "url": "https://api.stlouisfed.org/fred/series/observations?series_id={query}&api_key=" + os.getenv("FRED_KEY", "") + "&file_type=json",
        "description": "Economic data",
        "free_limit": "120/min",
        "keywords": ["gdp", "inflation", "economy", "interest", "rate", "fed"]
    },
    
    "world_bank": {
        "name": "World Bank",
        "category": "finance",
        "url": "https://api.worldbank.org/v2/country/{query}/indicator/NY.GDP.PCAP.CD?format=json",
        "description": "World development indicators",
        "free_limit": "unlimited",
        "keywords": ["world", "gdp", "development", "country", "poverty"]
    },
    
    "ecb": {
        "name": "European Central Bank",
        "category": "finance",
        "url": "https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A",
        "description": "ECB exchange rates",
        "free_limit": "unlimited",
        "keywords": ["ecb", "euro", "taux", "rate", "banque centrale"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 DONNÉES GOUVERNEMENTALES
    # ═══════════════════════════════════════════════════════════════════
    
    "datagouv_fr": {
        "name": "Data.gouv.fr",
        "category": "government",
        "url": "https://www.data.gouv.fr/api/1/datasets/?q={query}&page_size=10",
        "description": "French government data",
        "free_limit": "unlimited",
        "keywords": ["france", "gouvernement", "data", "open data", "public"]
    },
    
    "insee": {
        "name": "INSEE",
        "category": "government",
        "url": "https://api.insee.fr/entreprises/sirene/V3/siret?q={query}",
        "description": "French company registry",
        "free_limit": "limited",
        "keywords": ["entreprise", "siret", "société", "company", "france"]
    },
    
    "us_census": {
        "name": "US Census",
        "category": "government",
        "url": "https://api.census.gov/data/2020/acs/acs5?get=NAME&for=state:*",
        "description": "US Census data",
        "free_limit": "unlimited",
        "keywords": ["census", "population", "usa", "demographics"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 PODCASTS & AUDIO
    # ═══════════════════════════════════════════════════════════════════
    
    "listennotes": {
        "name": "Listen Notes",
        "category": "audio",
        "url": "https://listen-api.listennotes.com/api/v2/search?q={query}&type=podcast",
        "headers": {"X-ListenAPI-Key": os.getenv("LISTENNOTES_KEY", "")},
        "description": "Podcast search",
        "free_limit": "unlimited",
        "keywords": ["podcast", "audio", "episode", "show", "listen"]
    },
    
    "radio_browser": {
        "name": "Radio Browser",
        "category": "audio",
        "url": "https://de1.api.radio-browser.info/json/stations/search?name={query}&limit=10",
        "description": "Internet radio stations",
        "free_limit": "unlimited",
        "keywords": ["radio", "station", "stream", "live", "music"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 TRANSPORT & MOBILITÉ
    # ═══════════════════════════════════════════════════════════════════
    
    "citybikes": {
        "name": "CityBikes",
        "category": "transport",
        "url": "https://api.citybik.es/v2/networks/{query}",
        "description": "Bike sharing worldwide",
        "free_limit": "unlimited",
        "keywords": ["bike", "vélo", "cycling", "sharing", "city"]
    },
    
    "opencharger": {
        "name": "Open Charge Map",
        "category": "transport",
        "url": "https://api.openchargemap.io/v3/poi/?output=json&countrycode={query}&maxresults=10",
        "description": "EV charging stations",
        "free_limit": "unlimited",
        "keywords": ["electric", "charge", "ev", "tesla", "voiture électrique"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 IMMOBILIER
    # ═══════════════════════════════════════════════════════════════════
    
    "dvf": {
        "name": "DVF (Immobilier France)",
        "category": "realestate",
        "url": "https://api.cquest.org/dvf?code_postal={query}",
        "description": "French property sales",
        "free_limit": "unlimited",
        "keywords": ["immobilier", "maison", "appartement", "prix", "vente", "achat"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 ESPACE & ASTRONOMIE
    # ═══════════════════════════════════════════════════════════════════
    
    "spacex": {
        "name": "SpaceX API",
        "category": "science",
        "url": "https://api.spacexdata.com/v4/launches/latest",
        "description": "SpaceX launches",
        "free_limit": "unlimited",
        "keywords": ["spacex", "rocket", "launch", "elon", "musk", "falcon"]
    },
    
    "iss": {
        "name": "ISS Location",
        "category": "science",
        "url": "http://api.open-notify.org/iss-now.json",
        "description": "ISS current position",
        "free_limit": "unlimited",
        "keywords": ["iss", "space station", "astronaut", "orbit"]
    },
    
    "asteroid": {
        "name": "NASA Asteroids",
        "category": "science",
        "url": "https://api.nasa.gov/neo/rest/v1/feed?api_key=" + os.getenv("NASA_API_KEY", "DEMO_KEY"),
        "description": "Near Earth Objects",
        "free_limit": "1000/hour",
        "keywords": ["asteroid", "astéroïde", "meteor", "near earth"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 CULTURE & LOISIRS
    # ═══════════════════════════════════════════════════════════════════
    
    "boardgamegeek": {
        "name": "BoardGameGeek",
        "category": "entertainment",
        "url": "https://boardgamegeek.com/xmlapi2/search?query={query}&type=boardgame",
        "description": "Board games database",
        "free_limit": "unlimited",
        "keywords": ["board game", "jeu de société", "tabletop", "cards", "cartes"]
    },
    
    "openlibrary_works": {
        "name": "Open Library Works",
        "category": "books",
        "url": "https://openlibrary.org/search/authors.json?q={query}",
        "description": "Authors database",
        "free_limit": "unlimited",
        "keywords": ["author", "auteur", "writer", "écrivain", "book"]
    },
    
    "goodreads_alt": {
        "name": "Hardcover Books",
        "category": "books",
        "url": "https://hardcover.app/api/v1/books/search?query={query}",
        "description": "Books recommendations",
        "free_limit": "limited",
        "keywords": ["book", "read", "recommendation", "best seller"]
    },
    
    "eventbrite": {
        "name": "Eventbrite",
        "category": "events",
        "url": "https://www.eventbriteapi.com/v3/events/search/?q={query}",
        "description": "Events nearby",
        "free_limit": "1000/hour",
        "keywords": ["event", "événement", "concert", "festival", "sortie"]
    },
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕🆕 MEGA EXPANSION - 80+ NOUVELLES APIs
    # ═══════════════════════════════════════════════════════════════════
    
    # ─────────────────────────────────────────────────────────────────────
    # 💰 CRYPTO EXCHANGES ADDITIONNELS
    # ─────────────────────────────────────────────────────────────────────
    
    "kraken": {
        "name": "Kraken",
        "category": "crypto",
        "url": "https://api.kraken.com/0/public/Ticker?pair={symbol}USD",
        "description": "Kraken crypto exchange",
        "free_limit": "unlimited",
        "keywords": ["kraken", "crypto", "exchange", "bitcoin", "trading"]
    },
    
    "bitfinex": {
        "name": "Bitfinex",
        "category": "crypto",
        "url": "https://api-pub.bitfinex.com/v2/ticker/t{symbol}USD",
        "description": "Bitfinex exchange",
        "free_limit": "unlimited",
        "keywords": ["bitfinex", "crypto", "margin", "trading"]
    },
    
    "cryptocompare": {
        "name": "CryptoCompare",
        "category": "crypto",
        "url": "https://min-api.cryptocompare.com/data/price?fsym={symbol}&tsyms=USD,EUR",
        "description": "Multi-exchange crypto data",
        "free_limit": "100K/month",
        "keywords": ["crypto", "compare", "price", "market"]
    },
    
    "kucoin": {
        "name": "KuCoin",
        "category": "crypto",
        "url": "https://api.kucoin.com/api/v1/market/stats?symbol={symbol}-USDT",
        "description": "KuCoin exchange data",
        "free_limit": "unlimited",
        "keywords": ["kucoin", "crypto", "altcoin", "trading"]
    },
    
    "coinpaprika": {
        "name": "Coinpaprika",
        "category": "crypto",
        "url": "https://api.coinpaprika.com/v1/search?q={query}",
        "description": "Crypto market data",
        "free_limit": "unlimited",
        "keywords": ["crypto", "coin", "market", "ico"]
    },
    
    "livecoinwatch": {
        "name": "LiveCoinWatch",
        "category": "crypto",
        "url": "https://api.livecoinwatch.com/coins/single?currency=USD&code={symbol}",
        "description": "Real-time crypto prices",
        "free_limit": "10/sec",
        "keywords": ["crypto", "live", "watch", "price"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 📰 NEWS SOURCES ADDITIONNELS
    # ─────────────────────────────────────────────────────────────────────
    
    "guardian": {
        "name": "The Guardian",
        "category": "news",
        "url": "https://content.guardianapis.com/search?q={query}&api-key=" + os.getenv("GUARDIAN_KEY", "test"),
        "description": "The Guardian news",
        "free_limit": "5000/day",
        "keywords": ["guardian", "uk", "news", "british", "politics"]
    },
    
    "nyt_search": {
        "name": "New York Times",
        "category": "news",
        "url": "https://api.nytimes.com/svc/search/v2/articlesearch.json?q={query}&api-key=" + os.getenv("NYT_KEY", ""),
        "description": "NYT articles",
        "free_limit": "500/day",
        "keywords": ["nyt", "new york times", "usa", "america", "news"]
    },
    
    "mediastack": {
        "name": "Mediastack",
        "category": "news",
        "url": "http://api.mediastack.com/v1/news?access_key=" + os.getenv("MEDIASTACK_KEY", "") + "&keywords={query}",
        "description": "World news",
        "free_limit": "500/month",
        "keywords": ["news", "world", "live", "breaking"]
    },
    
    "newsdata": {
        "name": "NewsData.io",
        "category": "news",
        "url": "https://newsdata.io/api/1/news?apikey=" + os.getenv("NEWSDATA_KEY", "") + "&q={query}",
        "description": "News from 50+ countries",
        "free_limit": "200/day",
        "keywords": ["news", "global", "world", "breaking"]
    },
    
    "bing_news": {
        "name": "Bing News",
        "category": "news",
        "url": "https://api.bing.microsoft.com/v7.0/news/search?q={query}",
        "headers": {"Ocp-Apim-Subscription-Key": os.getenv("BING_KEY", "")},
        "description": "Bing News search",
        "free_limit": "1000/month",
        "keywords": ["bing", "microsoft", "news", "search"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🌤️ WEATHER APIS ADDITIONNELS
    # ─────────────────────────────────────────────────────────────────────
    
    "weatherapi": {
        "name": "WeatherAPI",
        "category": "weather",
        "url": "https://api.weatherapi.com/v1/current.json?key=" + os.getenv("WEATHERAPI_KEY", "") + "&q={city}",
        "description": "Weather forecasts",
        "free_limit": "1M/month",
        "keywords": ["weather", "forecast", "temperature", "rain"]
    },
    
    "visualcrossing": {
        "name": "Visual Crossing",
        "category": "weather",
        "url": "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{city}?key=" + os.getenv("VISUALCROSSING_KEY", ""),
        "description": "Historical weather",
        "free_limit": "1000/day",
        "keywords": ["weather", "history", "climate", "historical"]
    },
    
    "tomorrow_io": {
        "name": "Tomorrow.io",
        "category": "weather",
        "url": "https://api.tomorrow.io/v4/weather/realtime?location={city}&apikey=" + os.getenv("TOMORROW_KEY", ""),
        "description": "Minute-by-minute weather",
        "free_limit": "500/day",
        "keywords": ["weather", "forecast", "tomorrow", "minute"]
    },
    
    "meteosource": {
        "name": "Meteosource",
        "category": "weather",
        "url": "https://www.meteosource.com/api/v1/free/point?place_id={city}&key=" + os.getenv("METEOSOURCE_KEY", ""),
        "description": "AI weather forecasts",
        "free_limit": "400/day",
        "keywords": ["meteo", "weather", "ai", "forecast"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🏥 HEALTH & MEDICAL ADDITIONNELS
    # ─────────────────────────────────────────────────────────────────────
    
    "who_gho": {
        "name": "WHO Global Health",
        "category": "health",
        "url": "https://ghoapi.azureedge.net/api/Indicator?$filter=contains(IndicatorName,'{query}')",
        "description": "WHO health data",
        "free_limit": "unlimited",
        "keywords": ["who", "health", "global", "disease", "santé"]
    },
    
    "cdc_wonder": {
        "name": "CDC WONDER",
        "category": "health",
        "url": "https://wonder.cdc.gov/controller/datarequest/{query}",
        "description": "CDC epidemiology",
        "free_limit": "unlimited",
        "keywords": ["cdc", "epidemiology", "disease", "mortality"]
    },
    
    "clinicaltrials": {
        "name": "ClinicalTrials.gov",
        "category": "health",
        "url": "https://clinicaltrials.gov/api/v2/studies?query.term={query}&pageSize=10",
        "description": "Clinical trials",
        "free_limit": "unlimited",
        "keywords": ["trial", "clinical", "study", "research", "treatment"]
    },
    
    "drugbank": {
        "name": "DrugBank",
        "category": "health",
        "url": "https://go.drugbank.com/unearth/q?query={query}&searcher=drugs",
        "description": "Drug database",
        "free_limit": "limited",
        "keywords": ["drug", "medicine", "medication", "interaction"]
    },
    
    "rxnorm": {
        "name": "RxNorm",
        "category": "health",
        "url": "https://rxnav.nlm.nih.gov/REST/drugs.json?name={query}",
        "description": "Drug nomenclature",
        "free_limit": "unlimited",
        "keywords": ["rx", "prescription", "drug", "medicine"]
    },
    
    "disease_sh": {
        "name": "Disease.sh",
        "category": "health",
        "url": "https://disease.sh/v3/covid-19/all",
        "description": "Disease statistics",
        "free_limit": "unlimited",
        "keywords": ["disease", "pandemic", "statistics", "outbreak"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 💼 JOBS & CAREERS
    # ─────────────────────────────────────────────────────────────────────
    
    "adzuna": {
        "name": "Adzuna",
        "category": "jobs",
        "url": "https://api.adzuna.com/v1/api/jobs/fr/search/1?app_id=" + os.getenv("ADZUNA_ID", "") + "&app_key=" + os.getenv("ADZUNA_KEY", "") + "&what={query}",
        "description": "Job listings",
        "free_limit": "1000/month",
        "keywords": ["job", "emploi", "travail", "career", "offre"]
    },
    
    "remoteok": {
        "name": "RemoteOK",
        "category": "jobs",
        "url": "https://remoteok.com/api?tag={query}",
        "description": "Remote jobs",
        "free_limit": "unlimited",
        "keywords": ["remote", "télétravail", "job", "work from home"]
    },
    
    "usajobs": {
        "name": "USAJobs",
        "category": "jobs",
        "url": "https://data.usajobs.gov/api/search?Keyword={query}",
        "headers": {"Authorization-Key": os.getenv("USAJOBS_KEY", "")},
        "description": "US government jobs",
        "free_limit": "unlimited",
        "keywords": ["government", "federal", "job", "usa"]
    },
    
    "arbeitagentur": {
        "name": "Arbeitsagentur",
        "category": "jobs",
        "url": "https://rest.arbeitsagentur.de/jobboerse/jobsuche/pc/v4/jobs?was={query}",
        "description": "German jobs",
        "free_limit": "unlimited",
        "keywords": ["allemagne", "germany", "job", "arbeit"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # ⚖️ LEGAL & LAW
    # ─────────────────────────────────────────────────────────────────────
    
    "courtlistener": {
        "name": "CourtListener",
        "category": "legal",
        "url": "https://www.courtlistener.com/api/rest/v3/search/?q={query}",
        "description": "US court opinions",
        "free_limit": "5000/hour",
        "keywords": ["court", "law", "legal", "opinion", "judge"]
    },
    
    "caselaw": {
        "name": "Caselaw Access",
        "category": "legal",
        "url": "https://api.case.law/v1/cases/?search={query}",
        "description": "Case law database",
        "free_limit": "500/day",
        "keywords": ["case", "law", "legal", "precedent"]
    },
    
    "legifrance": {
        "name": "Légifrance",
        "category": "legal",
        "url": "https://api.aife.economie.gouv.fr/dila/legifrance/lf-engine-app/search?query={query}",
        "description": "French law",
        "free_limit": "limited",
        "keywords": ["loi", "france", "jurisprudence", "droit", "légal"]
    },
    
    "eur_lex": {
        "name": "EUR-Lex",
        "category": "legal",
        "url": "https://eur-lex.europa.eu/search.html?qid=&text={query}",
        "description": "EU law",
        "free_limit": "unlimited",
        "keywords": ["eu", "european", "law", "regulation", "directive"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🏠 REAL ESTATE ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "zillow_alt": {
        "name": "Rentcast",
        "category": "realestate",
        "url": "https://api.rentcast.io/v1/properties?city={city}",
        "description": "US rental data",
        "free_limit": "100/month",
        "keywords": ["rent", "loyer", "property", "house", "apartment"]
    },
    
    "redfin_alt": {
        "name": "RealtyMole",
        "category": "realestate",
        "url": "https://realty-mole-property-api.p.rapidapi.com/saleListings?city={city}",
        "description": "Property listings",
        "free_limit": "50/month",
        "keywords": ["buy", "acheter", "house", "maison", "sale"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🔭 ASTRONOMY & SPACE ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "astropy_horizons": {
        "name": "JPL Horizons",
        "category": "science",
        "url": "https://ssd.jpl.nasa.gov/api/horizons.api?COMMAND='{query}'",
        "description": "Solar system data",
        "free_limit": "unlimited",
        "keywords": ["planet", "planète", "solar system", "orbit"]
    },
    
    "exoplanet": {
        "name": "Exoplanet Archive",
        "category": "science",
        "url": "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+*+from+ps+where+pl_name+like+'%{query}%'&format=json",
        "description": "Exoplanet database",
        "free_limit": "unlimited",
        "keywords": ["exoplanet", "exoplanète", "star", "habitable"]
    },
    
    "meteorshowers": {
        "name": "Meteor Showers",
        "category": "science",
        "url": "https://api.nasa.gov/neo/rest/v1/neo/browse?api_key=" + os.getenv("NASA_API_KEY", "DEMO_KEY"),
        "description": "Meteor shower calendar",
        "free_limit": "unlimited",
        "keywords": ["meteor", "shower", "étoile filante", "pluie"]
    },
    
    "satellites": {
        "name": "N2YO Satellites",
        "category": "science",
        "url": "https://api.n2yo.com/rest/v1/satellite/above/48.8566/2.3522/0/70/18/&apiKey=" + os.getenv("N2YO_KEY", ""),
        "description": "Satellite tracking",
        "free_limit": "1000/hour",
        "keywords": ["satellite", "orbit", "tracking", "starlink"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🔤 LANGUAGE & TRANSLATION ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "mymemory": {
        "name": "MyMemory",
        "category": "language",
        "url": "https://api.mymemory.translated.net/get?q={query}&langpair=en|fr",
        "description": "Translation memory",
        "free_limit": "1000/day",
        "keywords": ["translate", "traduction", "translation", "langue"]
    },
    
    "wordsapi": {
        "name": "WordsAPI",
        "category": "language",
        "url": "https://wordsapiv1.p.rapidapi.com/words/{query}",
        "description": "Word definitions",
        "free_limit": "2500/day",
        "keywords": ["word", "definition", "synonym", "antonym"]
    },
    
    "urban_dictionary": {
        "name": "Urban Dictionary",
        "category": "language",
        "url": "https://api.urbandictionary.com/v0/define?term={query}",
        "description": "Slang definitions",
        "free_limit": "unlimited",
        "keywords": ["slang", "urban", "definition", "argot"]
    },
    
    "lingua_robot": {
        "name": "Lingua Robot",
        "category": "language",
        "url": "https://lingua-robot.p.rapidapi.com/language/v1/entries/en/{query}",
        "description": "Word pronunciation",
        "free_limit": "2500/day",
        "keywords": ["pronunciation", "phonetic", "audio", "ipa"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🎓 EDUCATION ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "coursera": {
        "name": "Coursera",
        "category": "education",
        "url": "https://api.coursera.org/api/courses.v1?q=search&query={query}",
        "description": "Online courses",
        "free_limit": "unlimited",
        "keywords": ["course", "mooc", "online", "certificate"]
    },
    
    "udemy": {
        "name": "Udemy",
        "category": "education",
        "url": "https://www.udemy.com/api-2.0/courses/?search={query}",
        "description": "Udemy courses",
        "free_limit": "limited",
        "keywords": ["udemy", "course", "tutorial", "video"]
    },
    
    "wolframalpha": {
        "name": "Wolfram Alpha",
        "category": "education",
        "url": "https://api.wolframalpha.com/v2/query?input={query}&appid=" + os.getenv("WOLFRAM_KEY", ""),
        "description": "Computational knowledge",
        "free_limit": "2000/month",
        "keywords": ["math", "calculate", "compute", "equation", "formula"]
    },
    
    "mathjs": {
        "name": "MathJS",
        "category": "education",
        "url": "https://api.mathjs.org/v4/?expr={query}",
        "description": "Math calculations",
        "free_limit": "unlimited",
        "keywords": ["math", "calcul", "equation", "algebra"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 📦 E-COMMERCE ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "etsy": {
        "name": "Etsy",
        "category": "ecommerce",
        "url": "https://openapi.etsy.com/v3/application/listings/active?keywords={query}",
        "headers": {"x-api-key": os.getenv("ETSY_KEY", "")},
        "description": "Handmade products",
        "free_limit": "10000/day",
        "keywords": ["handmade", "craft", "artisan", "vintage"]
    },
    
    "ebay": {
        "name": "eBay",
        "category": "ecommerce",
        "url": "https://api.ebay.com/buy/browse/v1/item_summary/search?q={query}",
        "headers": {"Authorization": "Bearer " + os.getenv("EBAY_TOKEN", "")},
        "description": "eBay listings",
        "free_limit": "5000/day",
        "keywords": ["ebay", "auction", "buy", "sell", "used"]
    },
    
    "bestbuy": {
        "name": "Best Buy",
        "category": "ecommerce",
        "url": "https://api.bestbuy.com/v1/products(search={query})?apiKey=" + os.getenv("BESTBUY_KEY", "") + "&format=json",
        "description": "Electronics",
        "free_limit": "50000/day",
        "keywords": ["electronics", "tech", "buy", "gadget"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🚗 AUTOMOTIVE
    # ─────────────────────────────────────────────────────────────────────
    
    "nhtsa": {
        "name": "NHTSA",
        "category": "automotive",
        "url": "https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/{query}?format=json",
        "description": "Vehicle recalls and safety",
        "free_limit": "unlimited",
        "keywords": ["car", "voiture", "vehicle", "recall", "safety"]
    },
    
    "fueleconomy": {
        "name": "Fuel Economy",
        "category": "automotive",
        "url": "https://www.fueleconomy.gov/ws/rest/vehicle/menu/make",
        "description": "Fuel efficiency data",
        "free_limit": "unlimited",
        "keywords": ["fuel", "mpg", "consumption", "essence", "diesel"]
    },
    
    "carquery": {
        "name": "CarQuery",
        "category": "automotive",
        "url": "https://www.carqueryapi.com/api/0.3/?cmd=getModels&make={query}",
        "description": "Car specifications",
        "free_limit": "unlimited",
        "keywords": ["car", "specs", "model", "brand", "marque"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🎮 GAMING ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "steam": {
        "name": "Steam",
        "category": "gaming",
        "url": "https://store.steampowered.com/api/storesearch/?term={query}&l=french",
        "description": "Steam games",
        "free_limit": "unlimited",
        "keywords": ["steam", "pc game", "gaming", "valve"]
    },
    
    "igdb": {
        "name": "IGDB",
        "category": "gaming",
        "url": "https://api.igdb.com/v4/games",
        "headers": {"Client-ID": os.getenv("IGDB_CLIENT", ""), "Authorization": "Bearer " + os.getenv("IGDB_TOKEN", "")},
        "description": "Internet Game Database",
        "free_limit": "4/sec",
        "keywords": ["game", "video game", "rating", "review"]
    },
    
    "freetogame": {
        "name": "FreeToGame",
        "category": "gaming",
        "url": "https://www.freetogame.com/api/games?category={query}",
        "description": "Free-to-play games",
        "free_limit": "unlimited",
        "keywords": ["free game", "f2p", "mmo", "gratuit"]
    },
    
    "cheapshark": {
        "name": "CheapShark",
        "category": "gaming",
        "url": "https://www.cheapshark.com/api/1.0/games?title={query}",
        "description": "Game deals",
        "free_limit": "unlimited",
        "keywords": ["deal", "sale", "discount", "promo", "game"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🏛️ GOVERNMENT DATA ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "opendatasoft": {
        "name": "OpenDataSoft",
        "category": "government",
        "url": "https://data.opendatasoft.com/api/records/1.0/search/?q={query}",
        "description": "Open data portals",
        "free_limit": "unlimited",
        "keywords": ["open data", "public", "government", "statistics"]
    },
    
    "eurostat": {
        "name": "Eurostat",
        "category": "government",
        "url": "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{query}",
        "description": "EU statistics",
        "free_limit": "unlimited",
        "keywords": ["eu", "europe", "statistics", "economics"]
    },
    
    "oecd": {
        "name": "OECD",
        "category": "government",
        "url": "https://stats.oecd.org/SDMX-JSON/data/{query}",
        "description": "OECD data",
        "free_limit": "unlimited",
        "keywords": ["oecd", "economics", "development", "policy"]
    },
    
    "uk_gov": {
        "name": "UK Government",
        "category": "government",
        "url": "https://www.gov.uk/api/search.json?q={query}",
        "description": "UK government info",
        "free_limit": "unlimited",
        "keywords": ["uk", "britain", "england", "government"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🔬 SCIENCE ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "chemspider": {
        "name": "ChemSpider",
        "category": "science",
        "url": "https://api.rsc.org/compounds/v1/filter/name?name={query}",
        "description": "Chemistry database",
        "free_limit": "1000/month",
        "keywords": ["chemistry", "molecule", "compound", "formula"]
    },
    
    "uniprot": {
        "name": "UniProt",
        "category": "science",
        "url": "https://rest.uniprot.org/uniprotkb/search?query={query}&format=json",
        "description": "Protein database",
        "free_limit": "unlimited",
        "keywords": ["protein", "gene", "biology", "sequence"]
    },
    
    "ensembl": {
        "name": "Ensembl",
        "category": "science",
        "url": "https://rest.ensembl.org/lookup/symbol/homo_sapiens/{query}?content-type=application/json",
        "description": "Genome browser",
        "free_limit": "unlimited",
        "keywords": ["genome", "dna", "gene", "genetics"]
    },
    
    "gbif": {
        "name": "GBIF",
        "category": "science",
        "url": "https://api.gbif.org/v1/species/search?q={query}",
        "description": "Biodiversity data",
        "free_limit": "unlimited",
        "keywords": ["species", "biodiversity", "taxonomy", "animal", "plant"]
    },
    
    "eol": {
        "name": "Encyclopedia of Life",
        "category": "science",
        "url": "https://eol.org/api/search/1.0.json?q={query}",
        "description": "Species information",
        "free_limit": "unlimited",
        "keywords": ["species", "animal", "plant", "life", "nature"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🎵 MUSIC ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "lastfm": {
        "name": "Last.fm",
        "category": "music",
        "url": "https://ws.audioscrobbler.com/2.0/?method=track.search&track={query}&api_key=" + os.getenv("LASTFM_KEY", "") + "&format=json",
        "description": "Music charts and info",
        "free_limit": "unlimited",
        "keywords": ["music", "song", "artist", "scrobble", "chart"]
    },
    
    "genius": {
        "name": "Genius",
        "category": "music",
        "url": "https://api.genius.com/search?q={query}",
        "headers": {"Authorization": "Bearer " + os.getenv("GENIUS_TOKEN", "")},
        "description": "Song lyrics",
        "free_limit": "unlimited",
        "keywords": ["lyrics", "paroles", "song", "annotation"]
    },
    
    "discogs": {
        "name": "Discogs",
        "category": "music",
        "url": "https://api.discogs.com/database/search?q={query}&type=release",
        "description": "Music database",
        "free_limit": "60/min",
        "keywords": ["vinyl", "record", "album", "discography"]
    },
    
    "setlistfm": {
        "name": "Setlist.fm",
        "category": "music",
        "url": "https://api.setlist.fm/rest/1.0/search/setlists?artistName={query}",
        "headers": {"x-api-key": os.getenv("SETLISTFM_KEY", "")},
        "description": "Concert setlists",
        "free_limit": "2/sec",
        "keywords": ["concert", "live", "setlist", "tour"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 📱 SOCIAL MEDIA ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "mastodon": {
        "name": "Mastodon",
        "category": "social",
        "url": "https://mastodon.social/api/v2/search?q={query}",
        "description": "Mastodon search",
        "free_limit": "unlimited",
        "keywords": ["mastodon", "fediverse", "social", "toot"]
    },
    
    "lemmy": {
        "name": "Lemmy",
        "category": "social",
        "url": "https://lemmy.world/api/v3/search?q={query}",
        "description": "Lemmy communities",
        "free_limit": "unlimited",
        "keywords": ["lemmy", "reddit alternative", "fediverse", "community"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🎭 ENTERTAINMENT ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "trakt": {
        "name": "Trakt",
        "category": "entertainment",
        "url": "https://api.trakt.tv/search/movie,show?query={query}",
        "headers": {"trakt-api-key": os.getenv("TRAKT_KEY", "")},
        "description": "Movie/TV tracking",
        "free_limit": "1000/day",
        "keywords": ["track", "watch", "movie", "series", "watchlist"]
    },
    
    "fanart": {
        "name": "Fanart.tv",
        "category": "entertainment",
        "url": "https://webservice.fanart.tv/v3/movies/{query}?api_key=" + os.getenv("FANART_KEY", ""),
        "description": "Fan artwork",
        "free_limit": "unlimited",
        "keywords": ["fanart", "poster", "wallpaper", "movie art"]
    },
    
    "opensubtitles": {
        "name": "OpenSubtitles",
        "category": "entertainment",
        "url": "https://api.opensubtitles.com/api/v1/subtitles?query={query}",
        "headers": {"Api-Key": os.getenv("OPENSUBTITLES_KEY", "")},
        "description": "Subtitles database",
        "free_limit": "200/day",
        "keywords": ["subtitles", "sous-titres", "srt", "vostfr"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🍺 FOOD & DRINKS ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "edamam": {
        "name": "Edamam",
        "category": "food",
        "url": "https://api.edamam.com/search?q={query}&app_id=" + os.getenv("EDAMAM_ID", "") + "&app_key=" + os.getenv("EDAMAM_KEY", ""),
        "description": "Recipe and nutrition",
        "free_limit": "10000/month",
        "keywords": ["recipe", "nutrition", "diet", "ingredient"]
    },
    
    "punkapi": {
        "name": "PunkAPI",
        "category": "food",
        "url": "https://api.punkapi.com/v2/beers?beer_name={query}",
        "description": "Craft beers",
        "free_limit": "unlimited",
        "keywords": ["beer", "bière", "craft", "brewery"]
    },
    
    "tastedive": {
        "name": "TasteDive",
        "category": "entertainment",
        "url": "https://tastedive.com/api/similar?q={query}&k=" + os.getenv("TASTEDIVE_KEY", ""),
        "description": "Recommendations",
        "free_limit": "300/hour",
        "keywords": ["similar", "recommend", "like", "suggestion"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🌍 TRAVEL ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "triposo": {
        "name": "Triposo",
        "category": "travel",
        "url": "https://www.triposo.com/api/20190906/poi.json?location_id={query}",
        "description": "Travel guides",
        "free_limit": "1000/month",
        "keywords": ["travel", "voyage", "tourism", "destination"]
    },
    
    "sygic": {
        "name": "Sygic",
        "category": "travel",
        "url": "https://api.sygictravelapi.com/1.2/en/places/list?query={query}",
        "headers": {"x-api-key": os.getenv("SYGIC_KEY", "")},
        "description": "Points of interest",
        "free_limit": "1000/day",
        "keywords": ["poi", "attraction", "tourist", "visit"]
    },
    
    "aviationstack": {
        "name": "Aviationstack",
        "category": "travel",
        "url": "http://api.aviationstack.com/v1/flights?access_key=" + os.getenv("AVIATIONSTACK_KEY", "") + "&flight_iata={query}",
        "description": "Flight tracking",
        "free_limit": "500/month",
        "keywords": ["flight", "vol", "airplane", "avion", "tracking"]
    },
    
    # ─────────────────────────────────────────────────────────────────────
    # 🔧 UTILITIES ADDITIONAL
    # ─────────────────────────────────────────────────────────────────────
    
    "emailvalidation": {
        "name": "Abstract Email",
        "category": "tools",
        "url": "https://emailvalidation.abstractapi.com/v1/?api_key=" + os.getenv("ABSTRACT_KEY", "") + "&email={query}",
        "description": "Email validation",
        "free_limit": "100/month",
        "keywords": ["email", "validate", "check", "verify"]
    },
    
    "ipgeolocation": {
        "name": "IPGeolocation",
        "category": "tools",
        "url": "https://api.ipgeolocation.io/ipgeo?apiKey=" + os.getenv("IPGEO_KEY", "") + "&ip={query}",
        "description": "IP geolocation",
        "free_limit": "1000/day",
        "keywords": ["ip", "location", "geo", "address"]
    },
    
    "urlscan": {
        "name": "URLScan.io",
        "category": "security",
        "url": "https://urlscan.io/api/v1/search/?q={query}",
        "description": "URL security analysis",
        "free_limit": "unlimited",
        "keywords": ["url", "security", "scan", "malware", "phishing"]
    },
    
    "virustotal": {
        "name": "VirusTotal",
        "category": "security",
        "url": "https://www.virustotal.com/api/v3/urls/{query}",
        "headers": {"x-apikey": os.getenv("VIRUSTOTAL_KEY", "")},
        "description": "Malware analysis",
        "free_limit": "500/day",
        "keywords": ["virus", "malware", "security", "scan", "safe"]
    },
    
    "screenshot": {
        "name": "Screenshot API",
        "category": "tools",
        "url": "https://api.screenshotmachine.com/?key=" + os.getenv("SCREENSHOT_KEY", "") + "&url={query}",
        "description": "Website screenshots",
        "free_limit": "100/month",
        "keywords": ["screenshot", "capture", "website", "preview"]
    },
    
    "pdf_co": {
        "name": "PDF.co",
        "category": "tools",
        "url": "https://api.pdf.co/v1/file/hash?url={query}",
        "headers": {"x-api-key": os.getenv("PDFCO_KEY", "")},
        "description": "PDF processing",
        "free_limit": "100/month",
        "keywords": ["pdf", "convert", "document", "file"]
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# CLASSE MEGA BRAIN
# ══════════════════════════════════════════════════════════════════════════════

class MegaApiBrain:
    """
    🧠 Le cerveau qui orchestre 50+ APIs gratuites
    """
    
    def __init__(self):
        self.registry = MEGA_API_REGISTRY
        self.http_client: Optional[httpx.AsyncClient] = None
        logger.info(f"🧠 MegaApiBrain initialized with {len(self.registry)} APIs")
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self.http_client is None or self.http_client.is_closed:
            self.http_client = httpx.AsyncClient(
                timeout=5.0,  # ⚡ Optimisé: 5s au lieu de 8s
                follow_redirects=True,
                headers={"User-Agent": "WikiAsk/2.0 MegaBrain"}
            )
        return self.http_client
    
    def detect_relevant_apis(self, query: str) -> List[str]:
        """Détecte les APIs pertinentes pour une requête."""
        query_lower = query.lower()
        relevant = []
        
        for api_id, api_config in self.registry.items():
            keywords = api_config.get("keywords", [])
            if any(kw in query_lower for kw in keywords):
                relevant.append(api_id)
        
        # Si pas de match spécifique, utiliser les APIs générales
        if not relevant:
            relevant = ["wikipedia", "hacker_news", "semantic_scholar"]
        
        return relevant[:10]  # Max 10 APIs par requête
    
    async def fetch_api(self, api_id: str, query: str, lang: str = "fr") -> Dict[str, Any]:
        """Fetch une API spécifique."""
        if api_id not in self.registry:
            return {"error": f"API {api_id} not found"}
        
        config = self.registry[api_id]
        
        try:
            client = await self._get_client()
            
            # Construire l'URL
            url = config["url"].format(
                query=quote(query),
                symbol=quote(query.upper()),
                city=quote(query),
                currency=quote(query.upper()),
                email=quote(query),
                ip=query,
                lat="48.8566",
                lon="2.3522",
                lang=lang
            )
            
            # Headers custom si présents
            headers = config.get("headers", {})
            
            resp = await client.get(url, headers=headers, timeout=5.0)
            
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    return {
                        "api_id": api_id,
                        "api_name": config["name"],
                        "category": config["category"],
                        "success": True,
                        "data": data
                    }
                except:
                    return {
                        "api_id": api_id,
                        "api_name": config["name"],
                        "success": True,
                        "data": resp.text[:500]
                    }
            else:
                logger.debug(f"API {api_id} returned {resp.status_code}")
                return {"api_id": api_id, "success": False, "error": f"HTTP {resp.status_code}"}
                
        except Exception as e:
            logger.debug(f"API {api_id} failed: {e}")
            return {"api_id": api_id, "success": False, "error": str(e)}
    
    async def query_brain(self, query: str, lang: str = "fr", max_apis: int = 8) -> Dict[str, Any]:
        """
        🧠 Interroge le cerveau - appelle les APIs pertinentes en parallèle.
        """
        start_time = asyncio.get_event_loop().time()
        
        # Détecter les APIs pertinentes
        relevant_apis = self.detect_relevant_apis(query)[:max_apis]
        
        logger.info(f"🧠 Brain querying {len(relevant_apis)} APIs for: {query[:50]}")
        
        # Appeler toutes les APIs en parallèle
        tasks = [self.fetch_api(api_id, query, lang) for api_id in relevant_apis]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Traiter les résultats
        successful = []
        failed = []
        
        for result in results:
            if isinstance(result, Exception):
                failed.append(str(result))
            elif isinstance(result, dict):
                if result.get("success"):
                    successful.append(result)
                else:
                    failed.append(result.get("error", "Unknown error"))
        
        elapsed = round((asyncio.get_event_loop().time() - start_time) * 1000)
        
        return {
            "query": query,
            "apis_queried": len(relevant_apis),
            "apis_successful": len(successful),
            "apis_failed": len(failed),
            "elapsed_ms": elapsed,
            "results": successful,
            "relevant_apis": relevant_apis
        }
    
    def format_results_for_ai(self, brain_results: Dict) -> str:
        """Formate les résultats du brain pour l'IA."""
        output = []
        
        for result in brain_results.get("results", []):
            api_name = result.get("api_name", "Unknown")
            data = result.get("data", {})
            
            output.append(f"\n📡 [{api_name}]:")
            
            # Formatting basé sur le type de données
            if isinstance(data, dict):
                # Extraire les infos pertinentes
                if "results" in data:
                    items = data["results"][:5]
                    for item in items:
                        if isinstance(item, dict):
                            title = item.get("title") or item.get("name") or item.get("text", "")[:100]
                            output.append(f"  • {title}")
                elif "articles" in data:
                    for article in data["articles"][:3]:
                        output.append(f"  • {article.get('title', '')}")
                elif "meals" in data and data["meals"]:
                    for meal in data["meals"][:3]:
                        output.append(f"  • {meal.get('strMeal', '')}")
                else:
                    # Générique
                    output.append(f"  {str(data)[:300]}")
            elif isinstance(data, list):
                for item in data[:5]:
                    if isinstance(item, dict):
                        title = item.get("title") or item.get("name") or str(item)[:100]
                        output.append(f"  • {title}")
                    else:
                        output.append(f"  • {str(item)[:100]}")
            else:
                output.append(f"  {str(data)[:300]}")
        
        return "\n".join(output)
    
    def get_stats(self) -> Dict[str, Any]:
        """Statistiques du brain."""
        categories = {}
        for api in self.registry.values():
            cat = api["category"]
            categories[cat] = categories.get(cat, 0) + 1
        
        return {
            "total_apis": len(self.registry),
            "categories": categories,
            "api_list": list(self.registry.keys())
        }


# ══════════════════════════════════════════════════════════════════════════════
# INSTANCE GLOBALE
# ══════════════════════════════════════════════════════════════════════════════

mega_brain = MegaApiBrain()


# ══════════════════════════════════════════════════════════════════════════════
# EXPORT
# ══════════════════════════════════════════════════════════════════════════════

__all__ = ["mega_brain", "MegaApiBrain", "MEGA_API_REGISTRY"]
