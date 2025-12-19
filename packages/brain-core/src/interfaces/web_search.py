"""
🌐 WEB SEARCH SERVICE
======================
Recherche web avec FILTRAGE QUALITÉ.
Seuls les sites de confiance apparaissent.
Partenaires en premier, puis sites de qualité uniquement.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from urllib.parse import quote
import asyncio
import httpx
import logging

from .trusted_sites import (
    is_trusted_url, 
    get_partner_links, 
    get_trusted_sites_for_domain,
    should_show_partners
)

logger = logging.getLogger(__name__)


class WebSearchService:
    """
    Service de recherche web avec filtrage qualité.
    - Partenaires prioritaires en premier
    - Filtrage strict : que des sites de confiance
    """
    
    SEARXNG_URLS = [
        "http://wikiask-searxng.internal:8080",
        "https://wikiask-searxng.fly.dev",
    ]
    
    TIMEOUT = 3.0
    
    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self.http_client is None or self.http_client.is_closed:
            self.http_client = httpx.AsyncClient(
                timeout=self.TIMEOUT,
                follow_redirects=True,
                headers={"User-Agent": "WikiAsk/6.0"}
            )
        return self.http_client
    
    async def search(
        self, 
        query: str, 
        lang: str = "en-US",
        max_results: int = 8,
        domain: str = "knowledge"
    ) -> Dict[str, Any]:
        """
        Recherche web avec filtrage qualité strict.
        
        1. Partenaires en premier (si applicable)
        2. Sites de confiance uniquement
        3. Pas de sites inconnus
        """
        start = datetime.now()
        encoded_query = quote(query)
        
        # 1. PARTENAIRES (toujours en premier si applicable)
        partner_links = get_partner_links(query)
        
        # 2. RECHERCHE SEARXNG + FILTRAGE
        quality_links = []
        source = None
        remaining_slots = max_results - len(partner_links)
        
        if remaining_slots > 0:
            for base_url in self.SEARXNG_URLS:
                try:
                    # Request 30 results to have enough after filtering
                    url = f"{base_url}/search?q={encoded_query}&format=json&language={lang}&pageno=1"
                    client = await self._get_client()
                    resp = await client.get(url, timeout=4.0)  # Increased timeout
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        results = data.get("results", [])
                        
                        # URLs déjà utilisées
                        used_urls = {link["url"] for link in partner_links}
                        
                        for r in results:
                            if len(quality_links) >= remaining_slots:
                                break
                            
                            url_result = r.get("url", "")
                            
                            # FILTRAGE QUALITÉ : que les sites de confiance
                            if url_result and url_result not in used_urls:
                                if is_trusted_url(url_result):
                                    quality_links.append({
                                        "title": r.get("title", "Sans titre"),
                                        "url": url_result,
                                        "snippet": r.get("content", "")[:200] if r.get("content") else ""
                                    })
                                    used_urls.add(url_result)
                        
                        source = "SearXNG"
                        break
                        
                except Exception as e:
                    logger.debug(f"SearXNG failed ({base_url}): {e}")
                    continue
            
            # Fallback DuckDuckGo avec filtrage
            if not quality_links and remaining_slots > 0:
                try:
                    ddg_url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_html=1"
                    client = await self._get_client()
                    resp = await client.get(ddg_url, timeout=self.TIMEOUT)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        
                        # Résultat principal
                        abstract_url = data.get("AbstractURL", "")
                        if abstract_url and is_trusted_url(abstract_url):
                            quality_links.append({
                                "title": data.get("Heading", query),
                                "url": abstract_url,
                                "snippet": data.get("AbstractText", "")[:200]
                            })
                        
                        # Topics
                        for topic in data.get("RelatedTopics", []):
                            if len(quality_links) >= remaining_slots:
                                break
                            if isinstance(topic, dict):
                                topic_url = topic.get("FirstURL", "")
                                if topic_url and is_trusted_url(topic_url):
                                    quality_links.append({
                                        "title": topic.get("Text", "")[:60],
                                        "url": topic_url,
                                        "snippet": topic.get("Text", "")[:200]
                                    })
                        
                        if quality_links:
                            source = "DuckDuckGo"
                        
                except Exception as e:
                    logger.debug(f"DuckDuckGo failed: {e}")
        
        # 3. COMBINER : Partenaires + Sites de qualité
        all_links = partner_links + quality_links
        
        elapsed = (datetime.now() - start).total_seconds() * 1000
        
        # Source label
        if partner_links and source:
            source = f"Partners + {source}"
        elif partner_links:
            source = "Partners"
        elif not source:
            source = "Filtered"
        
        return {
            "success": len(all_links) > 0,
            "links": all_links,
            "source": source,
            "partner_count": len(partner_links),
            "quality_count": len(quality_links),
            "execution_time_ms": round(elapsed)
        }
    
    async def close(self):
        if self.http_client and not self.http_client.is_closed:
            await self.http_client.aclose()
            self.http_client = None


# Singleton
web_search_service = WebSearchService()
