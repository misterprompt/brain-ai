"""
🎬 ENTERTAINMENT INTERFACE
==========================
Gère Films, Séries, Musique, Anime.
TMDB, TVMaze, Deezer, iTunes.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from urllib.parse import quote
import re

from .base import BaseInterface


class EntertainmentInterface(BaseInterface):
    """
    Expert Entertainment : Films, Séries, Musique.
    """
    
    DOMAIN_NAME = "entertainment"
    
    KEYWORDS = [
        # Films/Séries
        "film", "films", "movie", "movies", "série", "serie", "series", "saison",
        "cinema", "cinéma", "acteur", "actrice", "actor", "actress",
        "réalisateur", "director", "cast", "casting", "bande annonce", "trailer",
        # Plateformes streaming
        "netflix", "disney", "disney+", "prime video", "amazon prime", "hbo", "max",
        "canal+", "apple tv", "paramount", "peacock", "hulu",
        # Musique
        "musique", "music", "chanson", "song", "album", "artiste", "artist",
        "chanteur", "chanteuse", "singer", "rappeur", "rapper", "concert", "clip",
        "spotify", "deezer", "apple music", "youtube music",
        # Anime/Manga
        "anime", "manga", "japonais", "shonen", "seinen", "one piece", "naruto",
        "dragon ball", "attack on titan", "demon slayer", "jujutsu",
        # Types de contenu
        "documentaire", "documentary", "thriller", "comédie", "comedy", "horreur",
        "horror", "action", "drame", "drama", "sci-fi", "science fiction",
        # Temporels
        "2024", "2025", "nouveau", "new", "sortie", "release", "meilleur", "best",
        "oscar", "césars", "grammy", "récompense", "award"
    ]
    
    PATTERNS = [
        r"\b(film|movie|série|series)\s+(d[eu]|about|on)?\s*\w+\b",
        r"\b(netflix|disney|prime|hbo|canal|apple\s*tv)\b",
        r"\bmeilleur[es]?\s+(film|série|album|chanson)\b",
        r"\b(anime|manga)\s+\w+\b",
        r"\bsortie\s+(du\s+)?(film|série)\b",
    ]
    
    def extract_params(self, query: str) -> Dict[str, Any]:
        """Extrait le titre ou artiste mentionné."""
        q_lower = query.lower()
        params = {"query": query, "search_term": quote(query)}
        
        # Détecter le type de contenu
        if any(w in q_lower for w in ["musique", "music", "chanson", "song", "album", "artiste"]):
            params["type"] = "music"
        elif any(w in q_lower for w in ["anime", "manga"]):
            params["type"] = "anime"
        elif any(w in q_lower for w in ["série", "serie", "series", "tv"]):
            params["type"] = "tv"
        else:
            params["type"] = "movie"
        
        return params
    
    async def fetch_speed_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mode Speed : Une seule API selon le type."""
        start = datetime.now()
        
        search_term = params.get("search_term", quote(query))
        content_type = params.get("type", "movie")
        
        # Choisir l'API selon le type
        if content_type == "music":
            url = f"https://api.deezer.com/search?q={search_term}&limit=5"
        elif content_type == "anime":
            url = f"https://api.jikan.moe/v4/anime?q={search_term}&limit=5"
        else:
            url = f"https://api.tvmaze.com/search/shows?q={search_term}"
        
        data = await self._fetch_json(url, timeout=self.SPEED_TIMEOUT)
        
        if not data:
            return self._build_response(
                success=False,
                data={},
                context="Données entertainment indisponibles.",
                sources=[],
                start_time=start
            )
        
        context_lines = ["🎬 RÉSULTATS ENTERTAINMENT:\n"]
        source = ""
        
        # Parser selon la source
        if content_type == "music" and "data" in data:
            source = "Deezer"
            for track in data.get("data", [])[:5]:
                title = track.get("title", "?")
                artist = track.get("artist", {}).get("name", "?")
                context_lines.append(f"🎵 {title} - {artist}")
        
        elif content_type == "anime" and "data" in data:
            source = "Jikan/MAL"
            for anime in data.get("data", [])[:5]:
                title = anime.get("title", "?")
                score = anime.get("score", "N/A")
                context_lines.append(f"🎌 {title} (Score: {score})")
        
        else:  # TV/Movies via TVMaze
            source = "TVMaze"
            items = data if isinstance(data, list) else []
            for item in items[:5]:
                show = item.get("show", {})
                name = show.get("name", "?")
                year = show.get("premiered", "?")[:4] if show.get("premiered") else "?"
                rating = show.get("rating", {}).get("average", "N/A")
                context_lines.append(f"📺 {name} ({year}) - Note: {rating}/10")
        
        return self._build_response(
            success=True,
            data=data,
            context="\n".join(context_lines),
            sources=[source],
            start_time=start
        )
    
    async def fetch_deep_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mode Deep : Multiples sources."""
        start = datetime.now()
        
        search_term = params.get("search_term", quote(query))
        
        urls = [
            f"https://api.tvmaze.com/search/shows?q={search_term}",
            f"https://api.deezer.com/search?q={search_term}&limit=10",
            f"https://itunes.apple.com/search?term={search_term}&limit=10&media=music",
            f"https://openlibrary.org/search.json?q={search_term}&limit=5",
        ]
        
        results = await self._fetch_multiple(urls, timeout=self.DEEP_TIMEOUT)
        
        sources = []
        aggregated = {}
        
        if results[0]:
            sources.append("TVMaze")
            aggregated["tv"] = results[0][:10] if isinstance(results[0], list) else []
        
        if results[1] and results[1].get("data"):
            sources.append("Deezer")
            aggregated["music_deezer"] = results[1]["data"][:10]
        
        if results[2] and results[2].get("results"):
            sources.append("iTunes")
            aggregated["music_itunes"] = results[2]["results"][:10]
        
        if results[3] and results[3].get("docs"):
            sources.append("OpenLibrary")
            aggregated["books"] = results[3]["docs"][:5]
        
        context_parts = ["🎬 ENTERTAINMENT COMPLET:\n"]
        
        # TV/Films
        if aggregated.get("tv"):
            context_parts.append("📺 SÉRIES/FILMS:")
            for item in aggregated["tv"][:5]:
                show = item.get("show", {})
                context_parts.append(f"   • {show.get('name', '?')} ({show.get('premiered', '?')[:4] if show.get('premiered') else '?'})")
        
        # Musique
        if aggregated.get("music_deezer"):
            context_parts.append("\n🎵 MUSIQUE:")
            for track in aggregated["music_deezer"][:5]:
                context_parts.append(f"   • {track.get('title', '?')} - {track.get('artist', {}).get('name', '?')}")
        
        return self._build_response(
            success=len(sources) > 0,
            data=aggregated,
            context="\n".join(context_parts),
            sources=sources,
            start_time=start
        )
