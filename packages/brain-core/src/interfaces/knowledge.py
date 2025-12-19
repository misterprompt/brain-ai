"""
📚 KNOWLEDGE INTERFACE
======================
Interface Fallback : Wikipedia, SearXNG, DuckDuckGo.
Gère toutes les requêtes génériques non captées par les autres domaines.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from urllib.parse import quote
import re

from .base import BaseInterface


class KnowledgeInterface(BaseInterface):
    """
    Expert Généraliste : Connaissances, Définitions, Recherche Web.
    C'est le FALLBACK utilisé quand aucune autre interface ne match.
    """
    
    DOMAIN_NAME = "knowledge"
    
    # Pas de keywords spécifiques car c'est le fallback
    KEYWORDS = []
    PATTERNS = []
    
    def matches(self, query: str) -> bool:
        """
        Knowledge match toujours (fallback).
        Mais avec un score très bas pour que les autres aient priorité.
        """
        return True
    
    def get_match_score(self, query: str) -> int:
        """Score minimum pour être le fallback."""
        return 0
    
    # ══════════════════════════════════════════════════════════════
    # EXTRACTION DE PARAMÈTRES
    # ══════════════════════════════════════════════════════════════
    
    def extract_params(self, query: str) -> Dict[str, Any]:
        """Prépare la requête pour la recherche."""
        return {
            "query": query,
            "search_term": quote(query),
            "lang": self._detect_language(query)
        }
    
    def _detect_language(self, query: str) -> str:
        """Détecte la langue de la requête."""
        q_lower = query.lower()
        
        # Français
        if any(w in q_lower for w in ["qu'est-ce", "comment", "pourquoi", "où", "quand", "qui", "quel", "est-ce"]):
            return "fr"
        
        # Anglais par défaut
        return "en"
    
    # ══════════════════════════════════════════════════════════════
    # MODE SPEED
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_speed_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Speed : Wikipedia uniquement (très rapide).
        """
        start = datetime.now()
        
        search_term = params.get("search_term", quote(query))
        # Use language from params (set by user selection), fallback to auto-detect
        lang = params.get("lang", self._detect_language(query))
        
        # Normalize language code (fr-FR -> fr, en-US -> en)
        wiki_lang = lang.split("-")[0] if "-" in str(lang) else lang
        url = f"https://{wiki_lang}.wikipedia.org/api/rest_v1/page/summary/{search_term}"
        
        data = await self._fetch_json(url, timeout=self.SPEED_TIMEOUT)
        
        if not data or "extract" not in data:
            # Fallback DuckDuckGo
            ddg_url = f"https://api.duckduckgo.com/?q={search_term}&format=json&no_html=1"
            ddg_data = await self._fetch_json(ddg_url, timeout=self.SPEED_TIMEOUT)
            
            if ddg_data and ddg_data.get("AbstractText"):
                return self._build_response(
                    success=True,
                    data=ddg_data,
                    context=f"📚 {query.upper()}:\n{ddg_data.get('AbstractText', '')}",
                    sources=["DuckDuckGo"],
                    start_time=start
                )
            
            return self._build_response(
                success=False,
                data={},
                context="Aucune information trouvée pour cette recherche.",
                sources=[],
                start_time=start
            )
        
        # Formater la réponse Wikipedia
        title = data.get("title", query)
        extract = data.get("extract", "")
        
        context = f"📚 {title.upper()}:\n{extract}"
        
        return self._build_response(
            success=True,
            data=data,
            context=context,
            sources=[f"Wikipedia {lang.upper()}"],
            start_time=start
        )
    
    # ══════════════════════════════════════════════════════════════
    # MODE DEEP
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_deep_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Deep : Wikipedia + DuckDuckGo + Wikidata.
        Uses the language from params (user selection).
        """
        start = datetime.now()
        
        search_term = params.get("search_term", quote(query))
        lang = params.get("lang", "fr")
        
        # Normalize language code
        wiki_lang = lang.split("-")[0] if "-" in str(lang) else lang
        
        urls = [
            # Wikipedia in selected language (primary)
            f"https://{wiki_lang}.wikipedia.org/api/rest_v1/page/summary/{search_term}",
            # DuckDuckGo
            f"https://api.duckduckgo.com/?q={search_term}&format=json&no_html=1",
            # Wikidata in selected language
            f"https://www.wikidata.org/w/api.php?action=wbsearchentities&search={search_term}&language={wiki_lang}&format=json&limit=5",
        ]
        
        results = await self._fetch_multiple(urls, timeout=self.DEEP_TIMEOUT)
        
        sources = []
        aggregated = {}
        
        if results[0] and "extract" in results[0]:
            sources.append(f"Wikipedia {wiki_lang.upper()}")
            aggregated["wikipedia"] = results[0]
        
        if results[1] and (results[1].get("AbstractText") or results[1].get("RelatedTopics")):
            sources.append("DuckDuckGo")
            aggregated["duckduckgo"] = results[1]
        
        if results[2] and results[2].get("search"):
            sources.append("Wikidata")
            aggregated["wikidata"] = results[2]["search"]
        
        # Construire contexte riche
        context_parts = [f"📚 RECHERCHE: {query.upper()}\n"]
        
        # Wikipedia (prioritaire)
        if aggregated.get("wikipedia"):
            context_parts.append(f"📖 DÉFINITION ({wiki_lang.upper()}):")
            context_parts.append(f"   {aggregated['wikipedia'].get('extract', '')[:600]}")
        
        # DuckDuckGo - topics associés
        if aggregated.get("duckduckgo"):
            ddg = aggregated["duckduckgo"]
            if ddg.get("AbstractText"):
                context_parts.append(f"\n💡 RÉSUMÉ: {ddg['AbstractText'][:300]}")
            
            topics = ddg.get("RelatedTopics", [])[:3]
            if topics:
                context_parts.append("\n🔗 SUJETS CONNEXES:")
                for topic in topics:
                    if isinstance(topic, dict) and topic.get("Text"):
                        context_parts.append(f"   • {topic['Text'][:80]}")
        
        # Wikidata entities
        if aggregated.get("wikidata"):
            context_parts.append("\n🏷️ ENTITÉS LIÉES:")
            for entity in aggregated["wikidata"][:3]:
                label = entity.get("label", "?")
                desc = entity.get("description", "")[:50]
                context_parts.append(f"   • {label}: {desc}")
        
        return self._build_response(
            success=len(sources) > 0,
            data=aggregated,
            context="\n".join(context_parts),
            sources=sources,
            start_time=start
        )
