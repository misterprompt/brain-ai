"""
📄 CONTENT FETCHER
==================
Extrait le contenu textuel des pages de qualité.
Fournit du contexte riche pour l'IA.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio
import httpx
import re
import logging

logger = logging.getLogger(__name__)


class ContentFetcher:
    """
    Récupère et extrait le contenu textuel des pages web.
    Utilisé pour enrichir le contexte de l'IA.
    """
    
    TIMEOUT = 2.0  # Timeout strict pour Speed mode
    MAX_CONTENT_LENGTH = 600  # Caractères max par page
    MAX_PAGES = 2  # Nombre de pages à fetcher
    
    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self.http_client is None or self.http_client.is_closed:
            self.http_client = httpx.AsyncClient(
                timeout=self.TIMEOUT,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
                }
            )
        return self.http_client
    
    def _clean_html(self, html: str) -> str:
        """Extrait le texte principal du HTML."""
        if not html:
            return ""
        
        # Supprimer scripts, styles, etc.
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<nav[^>]*>.*?</nav>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<footer[^>]*>.*?</footer>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<header[^>]*>.*?</header>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
        
        # Supprimer toutes les balises HTML
        text = re.sub(r'<[^>]+>', ' ', html)
        
        # Nettoyer les espaces
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        # Supprimer les lignes trop courtes (navigation, boutons)
        lines = text.split('.')
        good_lines = [line.strip() for line in lines if len(line.strip()) > 30]
        text = '. '.join(good_lines[:10])  # Garder les 10 premières phrases
        
        return text[:self.MAX_CONTENT_LENGTH]
    
    async def fetch_page_content(self, url: str) -> Optional[Dict[str, str]]:
        """
        Récupère le contenu textuel d'une page.
        Retourne None en cas d'échec.
        """
        try:
            client = await self._get_client()
            resp = await client.get(url, timeout=self.TIMEOUT)
            
            if resp.status_code != 200:
                return None
            
            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type:
                return None
            
            html = resp.text
            text = self._clean_html(html)
            
            if len(text) < 50:  # Contenu trop court = pas utile
                return None
            
            # Extraire le titre
            title_match = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
            title = title_match.group(1).strip() if title_match else url
            
            return {
                "url": url,
                "title": title[:100],
                "content": text
            }
            
        except Exception as e:
            logger.debug(f"Failed to fetch {url[:50]}: {e}")
            return None
    
    async def fetch_multiple(self, urls: List[str]) -> List[Dict[str, str]]:
        """
        Récupère le contenu de plusieurs pages en parallèle.
        Retourne uniquement les pages réussies.
        """
        if not urls:
            return []
        
        # Limiter au nombre max de pages
        urls_to_fetch = urls[:self.MAX_PAGES]
        
        tasks = [self.fetch_page_content(url) for url in urls_to_fetch]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filtrer les résultats valides
        valid_results = []
        for result in results:
            if isinstance(result, dict) and result.get("content"):
                valid_results.append(result)
        
        return valid_results
    
    def build_context(self, api_context: str, page_contents: List[Dict]) -> str:
        """
        Combine le contexte API et les extraits de pages.
        Crée un contexte riche pour l'IA.
        """
        parts = []
        
        # Données API en premier
        if api_context:
            parts.append("📊 DONNÉES EN TEMPS RÉEL:")
            parts.append(api_context)
        
        # Extraits des pages de qualité
        if page_contents:
            parts.append("\n📰 SOURCES DE QUALITÉ:")
            for page in page_contents:
                source_name = self._extract_domain(page["url"])
                parts.append(f"\n🔹 {source_name}:")
                parts.append(f"   {page['content']}")
        
        return "\n".join(parts)
    
    def _extract_domain(self, url: str) -> str:
        """Extrait le nom de domaine d'une URL."""
        match = re.search(r'https?://(?:www\.)?([^/]+)', url)
        if match:
            return match.group(1).replace('.com', '').replace('.org', '').replace('.fr', '').title()
        return "Source"
    
    async def close(self):
        if self.http_client and not self.http_client.is_closed:
            await self.http_client.aclose()
            self.http_client = None


# Singleton
content_fetcher = ContentFetcher()
