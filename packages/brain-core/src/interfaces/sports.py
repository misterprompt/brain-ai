"""
⚽ SPORTS INTERFACE
===================
Gère le sport : Foot, Tennis, Basket, F1.
Isolé et robuste.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from urllib.parse import quote
import re

from .base import BaseInterface


# Équipes et ligues populaires
TEAMS = {
    # Football France
    "psg", "paris saint germain", "om", "olympique marseille", "ol", "lyon",
    "monaco", "lille", "rennes", "nice", "lens", "nantes",
    # Football Europe
    "real madrid", "barcelona", "barcelone", "bayern munich", "manchester united",
    "manchester city", "chelsea", "arsenal", "liverpool", "juventus", "inter milan",
    "ac milan", "napoli", "dortmund", "atletico madrid",
}

LEAGUES = {
    "ligue 1", "premier league", "la liga", "serie a", "bundesliga",
    "champions league", "europa league", "coupe du monde", "world cup",
}


class SportsInterface(BaseInterface):
    """
    Expert Sport : Football, Tennis, Basket, F1.
    """
    
    DOMAIN_NAME = "sports"
    
    KEYWORDS = [
        "football", "foot", "soccer", "match", "score", "résultat", "result",
        "ligue", "league", "champions", "coupe", "cup", "classement", "standing",
        "tennis", "basket", "basketball", "nba", "f1", "formule 1", "formula 1",
        "joueur", "player", "équipe", "team", "transfert", "transfer"
    ]
    
    PATTERNS = [
        r"\b(psg|om|ol|real|barca|bayern|chelsea|arsenal|liverpool|juventus)\b",
        r"\b(ligue\s*1|premier\s*league|la\s*liga|serie\s*a|bundesliga)\b",
        r"\bscore\s+(du\s+)?(match|psg|om)\b",
        r"\brésultats?\s+(football|foot|tennis|f1)\b",
    ]
    
    # ══════════════════════════════════════════════════════════════
    # EXTRACTION DE PARAMÈTRES
    # ══════════════════════════════════════════════════════════════
    
    def extract_params(self, query: str) -> Dict[str, Any]:
        """Extrait équipe/ligue mentionnée."""
        q_lower = query.lower()
        params = {"query": query, "search_term": quote(query)}
        
        # Chercher une équipe
        for team in TEAMS:
            if team in q_lower:
                params["team"] = team
                break
        
        # Chercher une ligue
        for league in LEAGUES:
            if league in q_lower:
                params["league"] = league
                break
        
        # Date du jour pour les événements
        params["date"] = datetime.now().strftime("%Y-%m-%d")
        
        return params
    
    # ══════════════════════════════════════════════════════════════
    # MODE SPEED
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_speed_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Speed : TheSportsDB (événements du jour).
        """
        start = datetime.now()
        
        team = params.get("team")
        date = params.get("date")
        
        # Si une équipe est mentionnée, chercher ses infos
        if team:
            url = f"https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t={quote(team)}"
        else:
            # Sinon, événements du jour
            url = f"https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d={date}&s=Soccer"
        
        data = await self._fetch_json(url, timeout=self.SPEED_TIMEOUT)
        
        if not data:
            return self._build_response(
                success=False,
                data={},
                context="Données sportives temporairement indisponibles.",
                sources=[],
                start_time=start
            )
        
        context_lines = ["⚽ DONNÉES SPORTIVES:\n"]
        
        # Format équipe
        if "teams" in data and data["teams"]:
            team_info = data["teams"][0]
            context_lines.append(f"🏟️ {team_info.get('strTeam', '?').upper()}")
            context_lines.append(f"   Pays: {team_info.get('strCountry', '?')}")
            context_lines.append(f"   Stade: {team_info.get('strStadium', '?')}")
            context_lines.append(f"   Ligue: {team_info.get('strLeague', '?')}")
            if team_info.get("strDescriptionFR"):
                context_lines.append(f"   {team_info['strDescriptionFR'][:200]}")
        
        # Format événements
        elif "events" in data and data["events"]:
            context_lines.append("📅 MATCHS DU JOUR:")
            for event in data["events"][:5]:
                home = event.get("strHomeTeam", "?")
                away = event.get("strAwayTeam", "?")
                score_home = event.get("intHomeScore", "-")
                score_away = event.get("intAwayScore", "-")
                context_lines.append(f"   {home} {score_home} - {score_away} {away}")
        
        return self._build_response(
            success=True,
            data=data,
            context="\n".join(context_lines),
            sources=["TheSportsDB"],
            start_time=start
        )
    
    # ══════════════════════════════════════════════════════════════
    # MODE DEEP
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_deep_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Deep : TheSportsDB (équipe + événements + classement).
        """
        start = datetime.now()
        
        team = params.get("team", "psg")
        date = params.get("date")
        
        urls = [
            # Recherche équipe
            f"https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t={quote(team)}",
            # Événements du jour
            f"https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d={date}&s=Soccer",
            # Classement Ligue 1
            "https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4334&s=2024-2025",
            # Ligues françaises
            "https://www.thesportsdb.com/api/v1/json/3/search_all_leagues.php?c=France&s=Soccer",
        ]
        
        results = await self._fetch_multiple(urls, timeout=self.DEEP_TIMEOUT)
        
        sources = []
        aggregated = {}
        
        if results[0] and results[0].get("teams"):
            sources.append("TheSportsDB Teams")
            aggregated["team"] = results[0]["teams"][0]
        
        if results[1] and results[1].get("events"):
            sources.append("TheSportsDB Events")
            aggregated["events"] = results[1]["events"][:10]
        
        if results[2] and results[2].get("table"):
            sources.append("TheSportsDB Standings")
            aggregated["standings"] = results[2]["table"][:10]
        
        # Construire contexte riche
        context_parts = ["⚽ INFORMATIONS SPORTIVES COMPLÈTES:\n"]
        
        # Équipe
        if aggregated.get("team"):
            t = aggregated["team"]
            context_parts.append(f"🏟️ {t.get('strTeam', '?').upper()}")
            context_parts.append(f"   Fondé en: {t.get('intFormedYear', '?')}")
            context_parts.append(f"   Stade: {t.get('strStadium', '?')} ({t.get('intStadiumCapacity', '?')} places)")
            context_parts.append(f"   Ligue: {t.get('strLeague', '?')}")
        
        # Matchs du jour
        if aggregated.get("events"):
            context_parts.append("\n📅 MATCHS DU JOUR:")
            for e in aggregated["events"][:5]:
                home = e.get("strHomeTeam", "?")
                away = e.get("strAwayTeam", "?")
                context_parts.append(f"   • {home} vs {away}")
        
        # Classement
        if aggregated.get("standings"):
            context_parts.append("\n🏆 CLASSEMENT LIGUE 1:")
            for i, row in enumerate(aggregated["standings"][:5], 1):
                team_name = row.get("strTeam", "?")
                points = row.get("intPoints", 0)
                context_parts.append(f"   {i}. {team_name} - {points} pts")
        
        return self._build_response(
            success=len(sources) > 0,
            data=aggregated,
            context="\n".join(context_parts),
            sources=sources,
            start_time=start
        )
