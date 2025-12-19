"""
🔬 MEGA API REGISTRY - Expert Mode Only
========================================
Registre complet de TOUTES les APIs gratuites disponibles.
Utilisé UNIQUEMENT par le mode Expert pour une recherche exhaustive.

Stratégie:
- Appels parallèles (asyncio.gather)
- Timeout court (2-3s max)
- Fail fast (on ignore les APIs lentes)
- Tri par pertinence de domaine
"""

import asyncio
import logging
from typing import Dict, List, Any
from urllib.parse import quote
import httpx

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# MEGA REGISTRY: 50+ APIs GRATUITES
# ══════════════════════════════════════════════════════════════════════════════

MEGA_APIS = {
    
    # ════════════════════════════════════════════════════════════════
    # 📚 ACADÉMIQUE & RECHERCHE (15 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "arxiv": {
        "url": "http://export.arxiv.org/api/query?search_query={query}&max_results=5",
        "domains": ["tech", "knowledge", "health", "finance"],
        "timeout": 3.0
    },
    "semantic_scholar": {
        "url": "https://api.semanticscholar.org/graph/v1/paper/search?query={query}&limit=5&fields=title,abstract,url",
        "domains": ["tech", "knowledge", "health", "finance"],
        "timeout": 3.0
    },
    "pubmed": {
        "url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={query}&retmode=json&retmax=5",
        "domains": ["health"],
        "timeout": 3.0
    },
    "europe_pmc": {
        "url": "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={query}&format=json&pageSize=5",
        "domains": ["health"],
        "timeout": 3.0
    },
    "core_ac_uk": {
        "url": "https://api.core.ac.uk/v3/search/works?q={query}&limit=5",
        "domains": ["tech", "knowledge", "health"],
        "timeout": 3.0
    },
    "doaj": {
        "url": "https://doaj.org/api/search/articles/{query}?pageSize=5",
        "domains": ["knowledge", "health", "tech"],
        "timeout": 3.0
    },
    "openlibrary": {
        "url": "https://openlibrary.org/search.json?q={query}&limit=5",
        "domains": ["knowledge", "entertainment", "food", "tourism"],
        "timeout": 2.0
    },
    "crossref": {
        "url": "https://api.crossref.org/works?query={query}&rows=5",
        "domains": ["tech", "knowledge", "health", "finance"],
        "timeout": 3.0
    },
    "base_search": {
        "url": "https://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi?func=PerformSearch&query={query}&format=json",
        "domains": ["knowledge", "tech", "health"],
        "timeout": 3.0
    },
    "dblp": {
        "url": "https://dblp.org/search/publ/api?q={query}&format=json&h=5",
        "domains": ["tech"],
        "timeout": 2.0
    },
    "repec": {
        "url": "https://api.repec.org/search?q={query}&limit=5",
        "domains": ["finance", "knowledge"],
        "timeout": 2.0
    },

    "wikimedia_images": {
        "url": "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={query}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|mime&format=json",
        "domains": ["knowledge", "tourism", "entertainment", "health", "tech", "food", "sports"],
        "timeout": 3.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # 🏥 SANTÉ & MÉDECINE (10 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "openfda": {
        "url": "https://api.fda.gov/drug/label.json?search={query}&limit=5",
        "domains": ["health"],
        "timeout": 3.0
    },
    "clinicaltrials": {
        "url": "https://clinicaltrials.gov/api/v2/studies?query.term={query}&pageSize=5",
        "domains": ["health"],
        "timeout": 3.0
    },
    "rxnorm": {
        "url": "https://rxnav.nlm.nih.gov/REST/drugs.json?name={query}",
        "domains": ["health"],
        "timeout": 2.0
    },
    "drugbank": {
        "url": "https://go.drugbank.com/unearth/q?searcher=drugs&query={query}",
        "domains": ["health"],
        "timeout": 2.0
    },
    "who_gho": {
        "url": "https://ghoapi.azureedge.net/api/Dimension",
        "domains": ["health"],
        "timeout": 2.0
    },
    "mesh": {
        "url": "https://id.nlm.nih.gov/mesh/lookup/descriptor?label={query}&match=contains&limit=5",
        "domains": ["health"],
        "timeout": 2.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # 💰 FINANCE & ÉCONOMIE (10 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "coingecko": {
        "url": "https://api.coingecko.com/api/v3/search?query={query}",
        "domains": ["finance"],
        "timeout": 2.0
    },
    "coincap": {
        "url": "https://api.coincap.io/v2/assets?search={query}&limit=5",
        "domains": ["finance"],
        "timeout": 2.0
    },
    "exchangerate": {
        "url": "https://api.exchangerate-api.com/v4/latest/USD",
        "domains": ["finance"],
        "timeout": 2.0
    },
    "world_bank": {
        "url": "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=5",
        "domains": ["finance", "knowledge"],
        "timeout": 2.0
    },
    "fred": {
        "url": "https://api.stlouisfed.org/fred/series/search?search_text={query}&api_key=demo&file_type=json",
        "domains": ["finance"],
        "timeout": 3.0
    },
    "alpha_vantage": {
        "url": "https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords={query}&apikey=demo",
        "domains": ["finance"],
        "timeout": 3.0
    },
    "oecd": {
        "url": "https://stats.oecd.org/restsdmx/sdmx.ashx/GetData/QNA/all?format=json",
        "domains": ["finance", "knowledge"],
        "timeout": 3.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # 🌤️ MÉTÉO & ENVIRONNEMENT (5 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "open_meteo": {
        "url": "https://geocoding-api.open-meteo.com/v1/search?name={query}&count=5",
        "domains": ["weather", "tourism"],
        "timeout": 2.0
    },
    "air_quality": {
        "url": "https://api.waqi.info/search/?keyword={query}&token=demo",
        "domains": ["weather", "health"],
        "timeout": 2.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # 🎬 ENTERTAINMENT (8 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "tmdb": {
        "url": "https://api.themoviedb.org/3/search/multi?query={query}&api_key=demo",
        "domains": ["entertainment"],
        "timeout": 2.0
    },
    "omdb": {
        "url": "https://www.omdbapi.com/?s={query}&apikey=demo",
        "domains": ["entertainment"],
        "timeout": 2.0
    },
    "tvmaze": {
        "url": "https://api.tvmaze.com/search/shows?q={query}",
        "domains": ["entertainment"],
        "timeout": 2.0
    },
    "itunes": {
        "url": "https://itunes.apple.com/search?term={query}&limit=5",
        "domains": ["entertainment"],
        "timeout": 2.0
    },
    "spotify_search": {
        "url": "https://api.spotify.com/v1/search?q={query}&type=track,artist&limit=5",
        "domains": ["entertainment"],
        "timeout": 2.0
    },
    "musicbrainz": {
        "url": "https://musicbrainz.org/ws/2/artist/?query={query}&fmt=json&limit=5",
        "domains": ["entertainment"],
        "timeout": 2.0
    },
    "openlibrary_books": {
        "url": "https://openlibrary.org/search.json?q={query}&limit=5",
        "domains": ["entertainment", "knowledge"],
        "timeout": 2.0
    },
    "gutenberg": {
        "url": "https://gutendex.com/books/?search={query}",
        "domains": ["entertainment", "knowledge"],
        "timeout": 2.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # 🍽️ FOOD & NUTRITION (5 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "themealdb": {
        "url": "https://www.themealdb.com/api/json/v1/1/search.php?s={query}",
        "domains": ["food"],
        "timeout": 2.0
    },
    "thecocktaildb": {
        "url": "https://www.thecocktaildb.com/api/json/v1/1/search.php?s={query}",
        "domains": ["food"],
        "timeout": 2.0
    },
    "edamam": {
        "url": "https://api.edamam.com/api/food-database/v2/parser?ingr={query}&app_id=demo&app_key=demo",
        "domains": ["food", "health"],
        "timeout": 2.0
    },
    "spoonacular": {
        "url": "https://api.spoonacular.com/recipes/complexSearch?query={query}&number=5&apiKey=demo",
        "domains": ["food"],
        "timeout": 2.0
    },
    "nutritionix": {
        "url": "https://trackapi.nutritionix.com/v2/search/instant?query={query}",
        "domains": ["food", "health"],
        "timeout": 2.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # ⚽ SPORTS (5 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "thesportsdb": {
        "url": "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t={query}",
        "domains": ["sports"],
        "timeout": 2.0
    },
    "football_data": {
        "url": "https://api.football-data.org/v4/competitions",
        "domains": ["sports"],
        "timeout": 2.0
    },
    "nhl": {
        "url": "https://statsapi.web.nhl.com/api/v1/teams",
        "domains": ["sports"],
        "timeout": 2.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # 💻 TECH & DEV (8 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "github": {
        "url": "https://api.github.com/search/repositories?q={query}&per_page=5",
        "domains": ["tech"],
        "timeout": 3.0
    },
    "stackoverflow": {
        "url": "https://api.stackexchange.com/2.3/search?order=desc&sort=relevance&intitle={query}&site=stackoverflow",
        "domains": ["tech"],
        "timeout": 2.0
    },
    "npm": {
        "url": "https://registry.npmjs.org/-/v1/search?text={query}&size=5",
        "domains": ["tech"],
        "timeout": 2.0
    },
    "pypi": {
        "url": "https://pypi.org/pypi/{query}/json",
        "domains": ["tech"],
        "timeout": 2.0
    },
    "crates": {
        "url": "https://crates.io/api/v1/crates?q={query}&per_page=5",
        "domains": ["tech"],
        "timeout": 2.0
    },
    "mdn": {
        "url": "https://developer.mozilla.org/api/v1/search?q={query}&locale=en-US",
        "domains": ["tech"],
        "timeout": 2.0
    },
    "devdocs": {
        "url": "https://devdocs.io/search?q={query}",
        "domains": ["tech"],
        "timeout": 2.0
    },
    "hackernews": {
        "url": "https://hn.algolia.com/api/v1/search?query={query}&hitsPerPage=5",
        "domains": ["tech"],
        "timeout": 2.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # ✈️ TOURISME & GÉOGRAPHIE (5 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "restcountries": {
        "url": "https://restcountries.com/v3.1/name/{query}",
        "domains": ["tourism", "knowledge"],
        "timeout": 2.0
    },
    "geonames": {
        "url": "http://api.geonames.org/searchJSON?q={query}&maxRows=5&username=demo",
        "domains": ["tourism", "knowledge"],
        "timeout": 2.0
    },
    "nominatim": {
        "url": "https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5",
        "domains": ["tourism"],
        "timeout": 2.0
    },
    "tripadvisor": {
        "url": "https://api.tripadvisor.com/api/partner/2.0/location_mapper?q={query}",
        "domains": ["tourism", "food"],
        "timeout": 2.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # 📰 NEWS & ACTUALITÉS (5 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "newsapi": {
        "url": "https://newsapi.org/v2/everything?q={query}&pageSize=5&apiKey=demo",
        "domains": ["knowledge", "entertainment", "sports", "finance"],
        "timeout": 2.0
    },
    "gnews": {
        "url": "https://gnews.io/api/v4/search?q={query}&max=5&token=demo",
        "domains": ["knowledge"],
        "timeout": 2.0
    },
    "mediastack": {
        "url": "http://api.mediastack.com/v1/news?access_key=demo&keywords={query}&limit=5",
        "domains": ["knowledge"],
        "timeout": 2.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # 🌍 DONNÉES OUVERTES (5 APIs)
    # ════════════════════════════════════════════════════════════════
    
    "wikidata": {
        "url": "https://www.wikidata.org/w/api.php?action=wbsearchentities&search={query}&language=en&format=json&limit=5",
        "domains": ["knowledge"],
        "timeout": 2.0
    },
    "dbpedia": {
        "url": "https://lookup.dbpedia.org/api/search?query={query}&maxResults=5&format=json",
        "domains": ["knowledge"],
        "timeout": 2.0
    },
    "datahub": {
        "url": "https://datahub.io/search/dataset.json?q={query}",
        "domains": ["knowledge", "finance"],
        "timeout": 2.0
    },
    "europeana": {
        "url": "https://api.europeana.eu/record/v2/search.json?query={query}&rows=5",
        "domains": ["knowledge", "entertainment"],
        "timeout": 2.0
    },
    "nasa": {
        "url": "https://images-api.nasa.gov/search?q={query}&media_type=image",
        "domains": ["knowledge", "tech"],
        "timeout": 2.0
    },
    
    # ════════════════════════════════════════════════════════════════
    # 📖 WIKIPEDIA (QUALITÉ MAXIMALE)
    # ════════════════════════════════════════════════════════════════
    
    "wikipedia_fr": {
        "url": "https://fr.wikipedia.org/api/rest_v1/page/summary/{query}",
        "domains": ["knowledge", "health", "tech", "finance", "entertainment", "sports", "food", "tourism"],
        "timeout": 2.0
    },
    "wikipedia_en": {
        "url": "https://en.wikipedia.org/api/rest_v1/page/summary/{query}",
        "domains": ["knowledge", "health", "tech", "finance", "entertainment", "sports", "food", "tourism"],
        "timeout": 2.0
    },
    "wikipedia_search_fr": {
        "url": "https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&format=json&srlimit=5",
        "domains": ["knowledge", "health", "tech", "finance", "entertainment", "sports", "food", "tourism"],
        "timeout": 2.0
    },
    "wikipedia_search_en": {
        "url": "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&format=json&srlimit=5",
        "domains": ["knowledge", "health", "tech", "finance", "entertainment", "sports", "food", "tourism"],
        "timeout": 2.0
    },
    "duckduckgo": {
        "url": "https://api.duckduckgo.com/?q={query}&format=json&no_html=1",
        "domains": ["knowledge", "health", "tech", "finance", "entertainment", "sports", "food", "tourism"],
        "timeout": 2.0
    },

    # ════════════════════════════════════════════════════════════════
    # 🌌 ESPACE & SCIENCE (Extraordinaire)
    # ════════════════════════════════════════════════════════════════
    "nasa_images": {
        "url": "https://images-api.nasa.gov/search?q={query}&media_type=image&page_size=5",
        "domains": ["knowledge", "tech", "entertainment"],
        "timeout": 3.0
    },

    # ════════════════════════════════════════════════════════════════
    # 🎨 ART & CULTURE (Musées)
    # ════════════════════════════════════════════════════════════════
    "met_museum": {
        "url": "https://collectionapi.metmuseum.org/public/collection/v1/search?q={query}&hasImages=true",
        "domains": ["knowledge", "entertainment", "tourism"],
        "timeout": 3.0
    },
    "artic_edu": {
        "url": "https://api.artic.edu/api/v1/artworks/search?q={query}&limit=5&fields=id,title,image_id",
        "domains": ["knowledge", "entertainment"],
        "timeout": 3.0
    },

    # ════════════════════════════════════════════════════════════════
    # 🌍 GÉOGRAPHIE & BIODIVERSITÉ
    # ════════════════════════════════════════════════════════════════
    "rest_countries": {
        "url": "https://restcountries.com/v3.1/name/{query}",
        "domains": ["knowledge", "tourism", "finance"],
        "timeout": 3.0
    },
    "gbif_biodiversity": {
        "url": "https://api.gbif.org/v1/species/search?q={query}&limit=5",
        "domains": ["knowledge", "health", "food"],
        "timeout": 3.0
    },

    # ════════════════════════════════════════════════════════════════
    # 🎵 LYRICS & QUOTES
    # ════════════════════════════════════════════════════════════════
    "lyrics_ovh": {
        "url": "https://api.lyrics.ovh/suggest/{query}",
        "domains": ["entertainment"],
        "timeout": 2.0
    },
    "zenquotes": {
        "url": "https://zenquotes.io/api/quotes", # Pas de recherche, mais bon contexte
        "domains": ["knowledge", "entertainment"],
        "timeout": 2.0
    },

    # ════════════════════════════════════════════════════════════════
    # 🛠️ OUTILS & TECH & FUN
    # ════════════════════════════════════════════════════════════════
    "hackernews": {
        "url": "https://hn.algolia.com/api/v1/search?query={query}&tags=story&hitsPerPage=5",
        "domains": ["tech", "finance"],
        "timeout": 2.0
    },
    "pokeapi": {
        "url": "https://pokeapi.co/api/v2/pokemon/{query}", # Juste pour le fun si query = pikachu
        "domains": ["entertainment", "knowledge"],
        "timeout": 2.0
    },
    "openbrewery": {
        "url": "https://api.openbrewerydb.org/breweries/search?query={query}",
        "domains": ["food", "tourism"],
        "timeout": 2.0
    }
}


class MegaAPIFetcher:
    """Fetcher parallèle pour toutes les APIs."""
    
    def __init__(self):
        self._client = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=5.0)
        return self._client
    
    async def fetch_single(self, api_name: str, config: Dict, query: str) -> Dict:
        """Fetch une seule API avec timeout."""
        try:
            client = await self._get_client()
            url = config["url"].format(query=quote(query))
            timeout = config.get("timeout", 2.0)
            
            resp = await client.get(url, timeout=timeout)
            if resp.status_code == 200:
                return {
                    "source": api_name,
                    "data": resp.text[:2500],  # More content for quality
                    "success": True
                }
        except Exception as e:
            logger.debug(f"API {api_name} failed: {e}")
        
        return {"source": api_name, "success": False}
    
    async def fetch_all_for_domain(
        self, 
        query: str, 
        domain: str,
        max_concurrent: int = 50  # 🚀 MODE SERVEUR DÉDIÉ : On ouvre les vannes !
    ) -> List[Dict]:
        """
        Fetch toutes les APIs pertinentes pour un domaine EN PARALLÈLE.
        Max 50 APIs simultanées (Serveur Dédié).
        """
        # Filtrer les APIs par domaine
        relevant_apis = {
            name: config 
            for name, config in MEGA_APIS.items() 
            if domain in config.get("domains", [])
        }
        
        logger.info(f"🔬 Expert: {len(relevant_apis)} APIs for domain '{domain}'")
        
        # Créer les tâches
        tasks = [
            self.fetch_single(name, config, query)
            for name, config in relevant_apis.items()
        ]
        
        # Limiter le nombre de requêtes parallèles
        results = []
        for i in range(0, len(tasks), max_concurrent):
            batch = tasks[i:i + max_concurrent]
            batch_results = await asyncio.gather(*batch, return_exceptions=True)
            
            for r in batch_results:
                if isinstance(r, dict) and r.get("success"):
                    results.append(r)
        
        logger.info(f"✅ Expert: {len(results)}/{len(relevant_apis)} APIs responded")
        return results
    
    async def close(self):
        if self._client:
            await self._client.aclose()


# Singleton
mega_api_fetcher = MegaAPIFetcher()

# Stats
def get_mega_stats() -> Dict:
    """Retourne les statistiques du registre."""
    domains = {}
    for config in MEGA_APIS.values():
        for d in config.get("domains", []):
            domains[d] = domains.get(d, 0) + 1
    
    return {
        "total_apis": len(MEGA_APIS),
        "domains": domains
    }
