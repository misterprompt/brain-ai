"""
🏨 TOURISM INTERFACE
====================
Gère le tourisme : Lieux, POI, Voyages, Restaurants.
Isolé et robuste.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from urllib.parse import quote
import re

from .base import BaseInterface


# Villes et pays populaires
DESTINATIONS = {
    # France
    "paris", "lyon", "marseille", "nice", "toulouse", "bordeaux", "cannes", "monaco",
    # Europe
    "london", "londres", "berlin", "rome", "madrid", "barcelona", "barcelone",
    "amsterdam", "vienna", "vienne", "prague", "lisbon", "lisbonne", "dublin",
    # Monde
    "new york", "los angeles", "tokyo", "dubai", "singapore", "singapour",
    "sydney", "toronto", "tel aviv", "bangkok", "bali", "maldives",
}


class TourismInterface(BaseInterface):
    """
    Expert Tourisme : Destinations, Restaurants, Activités.
    """
    
    DOMAIN_NAME = "tourism"
    
    KEYWORDS = [
        "voyage", "voyager", "travel", "vacances", "vacation", "holiday",
        "hôtel", "hotel", "restaurant", "manger", "where to eat",
        "visiter", "visit", "tourisme", "tourism", "activités", "activities",
        "que faire", "what to do", "où aller", "where to go",
        "musée", "museum", "monument", "plage", "beach", "montagne", "mountain"
    ]
    
    PATTERNS = [
        r"\b(où|ou|where)\s+(manger|dormir|aller|visiter)\b",
        r"\bque\s+faire\s+(à|a|in)\b",
        r"\b(hotel|hôtel|restaurant)\s+(à|a|in|near)?\s*\w+\b",
        r"\bvacances?\s+(à|a|en|in)\b",
        r"\bvisiter\s+\w+\b",
    ]
    
    # ══════════════════════════════════════════════════════════════
    # EXTRACTION DE PARAMÈTRES
    # ══════════════════════════════════════════════════════════════
    
    def extract_params(self, query: str) -> Dict[str, Any]:
        """Extrait la destination et le type de requête."""
        q_lower = query.lower()
        params = {"query": query, "search_term": quote(query)}
        
        # Chercher une destination connue
        for dest in DESTINATIONS:
            if dest in q_lower:
                params["destination"] = dest
                break
        
        # Détecter le type de recherche
        if any(w in q_lower for w in ["manger", "restaurant", "eat", "food"]):
            params["type"] = "restaurant"
        elif any(w in q_lower for w in ["hôtel", "hotel", "dormir", "sleep", "stay"]):
            params["type"] = "hotel"
        elif any(w in q_lower for w in ["visiter", "voir", "visit", "see", "musée", "museum"]):
            params["type"] = "attraction"
        else:
            params["type"] = "general"
        
        return params
    
    # ══════════════════════════════════════════════════════════════
    # MODE SPEED
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_speed_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Speed : Nominatim + Wikipedia (rapide et fiable).
        """
        start = datetime.now()
        
        destination = params.get("destination", "Paris")
        search_term = quote(destination)
        
        # Nominatim : géolocalisation + POI
        url = f"https://nominatim.openstreetmap.org/search?q={search_term}&format=json&limit=5&addressdetails=1"
        
        data = await self._fetch_json(url, timeout=self.SPEED_TIMEOUT)
        
        if not data:
            # Fallback: Wikipedia in user's selected language
            lang = params.get("lang", "fr")
            wiki_lang = lang.split("-")[0] if "-" in str(lang) else lang
            wiki_url = f"https://{wiki_lang}.wikipedia.org/api/rest_v1/page/summary/{search_term}"
            wiki_data = await self._fetch_json(wiki_url, timeout=self.SPEED_TIMEOUT)
            
            if wiki_data and "extract" in wiki_data:
                return self._build_response(
                    success=True,
                    data=wiki_data,
                    context=f"📍 {destination.upper()}:\n{wiki_data.get('extract', '')}",
                    sources=["Wikipedia"],
                    start_time=start
                )
            
            return self._build_response(
                success=False,
                data={},
                context=f"Informations sur {destination} temporairement indisponibles.",
                sources=[],
                start_time=start
            )
        
        # Formater
        context_lines = [f"📍 RÉSULTATS POUR: {destination.upper()}\n"]
        for place in data[:5]:
            display = place.get("display_name", "?")
            place_type = place.get("type", "lieu")
            context_lines.append(f"• {display[:80]}")
            context_lines.append(f"  Type: {place_type}")
        
        return self._build_response(
            success=True,
            data=data,
            context="\n".join(context_lines),
            sources=["OpenStreetMap"],
            start_time=start
        )
    
    # ══════════════════════════════════════════════════════════════
    # MODE DEEP
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_deep_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Deep : Nominatim + Wikipedia + Wikivoyage.
        Uses the language from params (user selection).
        """
        start = datetime.now()
        
        destination = params.get("destination", "Paris")
        search_term = quote(destination)
        req_type = params.get("type", "general")
        
        # Get language from params
        lang = params.get("lang", "fr")
        wiki_lang = lang.split("-")[0] if "-" in str(lang) else lang
        
        urls = [
            # Nominatim POI
            f"https://nominatim.openstreetmap.org/search?q={search_term}&format=json&limit=10&addressdetails=1",
            # Wikipedia in selected language
            f"https://{wiki_lang}.wikipedia.org/api/rest_v1/page/summary/{search_term}",
            # Wikivoyage (has language subdomains too)
            f"https://{wiki_lang}.wikivoyage.org/api/rest_v1/page/summary/{search_term}",
        ]
        
        results = await self._fetch_multiple(urls, timeout=self.DEEP_TIMEOUT)
        
        sources = []
        aggregated = {}
        
        if results[0]:
            sources.append("OpenStreetMap")
            aggregated["places"] = results[0]
        
        if results[1] and "extract" in results[1]:
            sources.append("Wikipedia FR")
            aggregated["wikipedia_fr"] = results[1]
        
        if results[2] and "extract" in results[2]:
            sources.append("Wikivoyage")
            aggregated["wikivoyage"] = results[2]
        
        if results[3] and "extract" in results[3]:
            sources.append("Wikipedia EN")
            aggregated["wikipedia_en"] = results[3]
        
        # Construire contexte riche
        context_parts = [f"🏨 GUIDE COMPLET: {destination.upper()}\n"]
        
        # Description Wikivoyage ou Wikipedia
        if aggregated.get("wikivoyage"):
            context_parts.append("📖 PRÉSENTATION:")
            context_parts.append(f"   {aggregated['wikivoyage'].get('extract', '')[:500]}")
        elif aggregated.get("wikipedia_fr"):
            context_parts.append("📖 PRÉSENTATION:")
            context_parts.append(f"   {aggregated['wikipedia_fr'].get('extract', '')[:500]}")
        
        # Lieux trouvés
        if aggregated.get("places"):
            context_parts.append("\n📍 LIEUX D'INTÉRÊT:")
            for place in aggregated["places"][:5]:
                name = place.get("display_name", "?")[:60]
                place_type = place.get("type", "")
                context_parts.append(f"   • {name} ({place_type})")
        
        return self._build_response(
            success=len(sources) > 0,
            data=aggregated,
            context="\n".join(context_parts),
            sources=sources,
            start_time=start
        )
