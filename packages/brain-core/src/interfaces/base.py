"""
🏛️ BASE INTERFACE (Contrat Abstrait)
=====================================
Toutes les interfaces de domaine héritent de cette classe.
Elle définit le contrat que chaque expert doit respecter.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import asyncio
import httpx
import logging
import re
from datetime import datetime

logger = logging.getLogger(__name__)


class BaseInterface(ABC):
    """
    Classe abstraite définissant le contrat pour tous les domaines.
    
    Chaque interface spécialisée (Finance, Météo, etc.) DOIT implémenter:
    - fetch_speed_data(): Réponse ultra-rapide (<1s)
    - fetch_deep_data(): Réponse complète et détaillée
    """
    
    # Nom du domaine (à surcharger)
    DOMAIN_NAME: str = "base"
    
    # Mots-clés pour la détection (à surcharger)
    KEYWORDS: List[str] = []
    
    # Patterns regex pour détection rapide (à surcharger)
    PATTERNS: List[str] = []
    
    # Timeout par défaut pour les requêtes
    SPEED_TIMEOUT: float = 4.0  # Mode Speed: augmenté pour fiabilité
    DEEP_TIMEOUT: float = 8.0   # Mode Deep: plus permissif
    
    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None
    
    # ══════════════════════════════════════════════════════════════
    # MÉTHODES ABSTRAITES (À IMPLÉMENTER)
    # ══════════════════════════════════════════════════════════════
    
    @abstractmethod
    async def fetch_speed_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode SPEED: Réponse ultra-rapide.
        - Maximum 1-2 appels API
        - Données condensées
        - Timeout court (2s max)
        
        Returns:
            {
                "success": bool,
                "domain": str,
                "data": Any,  # Données spécifiques au domaine
                "context": str,  # Résumé textuel pour l'IA
                "sources": List[str],
                "execution_time_ms": int
            }
        """
        pass
    
    @abstractmethod
    async def fetch_deep_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode DEEP/THINKING: Réponse complète.
        - Multiples APIs en parallèle
        - Agrégation massive de données
        - Timeout plus long (5-10s)
        
        Returns:
            {
                "success": bool,
                "domain": str,
                "data": Any,
                "context": str,
                "sources": List[str],
                "execution_time_ms": int
            }
        """
        pass
    
    @abstractmethod
    def extract_params(self, query: str) -> Dict[str, Any]:
        """
        Extrait les paramètres spécifiques au domaine depuis la requête.
        Ex: ville pour météo, symbole pour crypto, équipe pour sport.
        
        Returns:
            Dict avec les paramètres extraits
        """
        pass
    
    # ══════════════════════════════════════════════════════════════
    # MÉTHODES DE DÉTECTION
    # ══════════════════════════════════════════════════════════════
    
    def matches(self, query: str) -> bool:
        """
        Vérifie si cette interface peut gérer la requête.
        Utilise les keywords et patterns définis.
        """
        q_lower = query.lower()
        
        # Vérification par mots-clés
        for keyword in self.KEYWORDS:
            if keyword in q_lower:
                return True
        
        # Vérification par regex
        for pattern in self.PATTERNS:
            if re.search(pattern, q_lower, re.IGNORECASE):
                return True
        
        return False
    
    def get_match_score(self, query: str) -> int:
        """
        Calcule un score de correspondance (pour priorisation).
        Plus le score est élevé, plus l'interface est pertinente.
        """
        score = 0
        q_lower = query.lower()
        
        for keyword in self.KEYWORDS:
            if keyword in q_lower:
                score += 1
        
        for pattern in self.PATTERNS:
            if re.search(pattern, q_lower, re.IGNORECASE):
                score += 2  # Regex = plus précis
        
        return score
    
    # ══════════════════════════════════════════════════════════════
    # UTILITAIRES HTTP
    # ══════════════════════════════════════════════════════════════
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Retourne un client HTTP réutilisable."""
        if self.http_client is None or self.http_client.is_closed:
            self.http_client = httpx.AsyncClient(
                timeout=self.DEEP_TIMEOUT,
                follow_redirects=True,
                headers={"User-Agent": "WikiAsk/6.0"}
            )
        return self.http_client
    
    async def _fetch_json(
        self, 
        url: str, 
        timeout: Optional[float] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Optional[Dict]:
        """
        Fetch JSON depuis une URL avec gestion d'erreurs robuste.
        Ne fait JAMAIS planter l'interface.
        """
        try:
            client = await self._get_client()
            resp = await client.get(
                url, 
                timeout=timeout or self.SPEED_TIMEOUT,
                headers=headers
            )
            
            if resp.status_code == 200:
                text = resp.text
                # Ignorer les réponses HTML
                if text.strip().startswith("<!") or text.strip().startswith("<html"):
                    return None
                return resp.json()
            
            logger.debug(f"[{self.DOMAIN_NAME}] HTTP {resp.status_code} for {url[:50]}")
            return None
            
        except httpx.TimeoutException:
            logger.debug(f"[{self.DOMAIN_NAME}] Timeout for {url[:50]}")
            return None
        except Exception as e:
            logger.debug(f"[{self.DOMAIN_NAME}] Error fetching {url[:50]}: {e}")
            return None
    
    async def _fetch_multiple(
        self, 
        urls: List[str], 
        timeout: Optional[float] = None
    ) -> List[Optional[Dict]]:
        """
        Fetch plusieurs URLs en parallèle.
        Retourne une liste de résultats (None pour les échecs).
        """
        tasks = [self._fetch_json(url, timeout) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=False)
    
    # ══════════════════════════════════════════════════════════════
    # UTILITAIRES DE FORMATAGE
    # ══════════════════════════════════════════════════════════════
    
    def _build_response(
        self,
        success: bool,
        data: Any,
        context: str,
        sources: List[str],
        start_time: datetime
    ) -> Dict[str, Any]:
        """Construit la réponse standardisée."""
        elapsed = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "success": success,
            "domain": self.DOMAIN_NAME,
            "data": data,
            "context": context,
            "sources": sources,
            "execution_time_ms": round(elapsed)
        }
    
    async def close(self):
        """Ferme proprement le client HTTP."""
        if self.http_client and not self.http_client.is_closed:
            await self.http_client.aclose()
            self.http_client = None
