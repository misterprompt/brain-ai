"""
🏭 INTERFACE FACTORY
====================
Routeur intelligent qui analyse la requête et retourne
l'interface de domaine appropriée.
"""

from typing import Dict, List, Optional, Type
import logging

from .base import BaseInterface
from .finance import FinanceInterface
from .weather import WeatherInterface
from .tech import TechInterface
from .tourism import TourismInterface
from .sports import SportsInterface
from .entertainment import EntertainmentInterface
from .health import HealthInterface
from .food import FoodInterface
from .knowledge import KnowledgeInterface

logger = logging.getLogger(__name__)


class InterfaceFactory:
    """
    Factory Pattern : Crée et retourne la bonne interface selon la requête.
    
    Utilisation:
        factory = InterfaceFactory()
        interface = factory.get_interface("prix bitcoin")
        result = await interface.fetch_speed_data(query, params)
    """
    
    # Ordre de priorité des interfaces (les plus spécifiques en premier)
    INTERFACE_PRIORITY: List[Type[BaseInterface]] = [
        FinanceInterface,       # Crypto, Bourse
        WeatherInterface,       # Météo
        SportsInterface,        # Sport
        HealthInterface,        # Santé
        FoodInterface,          # Cuisine/Recettes
        EntertainmentInterface, # Films, Musique
        TechInterface,          # Code, Dev
        TourismInterface,       # Voyages
        KnowledgeInterface,     # Fallback (toujours en dernier)
    ]
    
    def __init__(self):
        # Cache des instances pour réutilisation
        self._instances: Dict[str, BaseInterface] = {}
        
        # Pré-instancier toutes les interfaces
        for interface_class in self.INTERFACE_PRIORITY:
            instance = interface_class()
            self._instances[instance.DOMAIN_NAME] = instance
        
        logger.info(f"🏭 InterfaceFactory initialized with {len(self._instances)} domains")
    
    def get_interface(self, query: str) -> BaseInterface:
        """
        Analyse la requête et retourne l'interface la plus appropriée.
        Détermine la meilleure interface pour une requête donnée.
        Parcourt les interfaces par ordre de priorité et vérifie si ça match.
        """
        # Nettoyage basique
        q_clean = query.strip()
        
        best_match: Optional[BaseInterface] = None
        best_score: int = -1
        
        # 1. Analyser chaque interface
        for name, instance in self._instances.items():
            # Si match direct (mot clé ou pattern)
            if instance.matches(q_clean):
                # On retourne direct le premier match spécifique (ordre de priorité)
                if name != "knowledge": # Knowledge est le fallback
                    logger.info(f"🎯 Query '{query[:30]}...' → {instance.DOMAIN_NAME} (direct match)")
                    return instance

            # Sinon on calcule un score pour plus tard
            score = instance.get_match_score(q_clean)
            if score > best_score:
                best_score = score
                best_match = instance
                
        # 2. Retourner le gagnant ou fallback
        if best_match and best_match.DOMAIN_NAME != "knowledge":
            logger.info(f"🎯 Query '{query[:30]}...' → {best_match.DOMAIN_NAME} (score: {best_score})")
            return best_match
            
        logger.info(f"🔄 Fallback to knowledge for '{query[:30]}...'")
        return self._instances["knowledge"]
    
    def get_all_interfaces(self) -> Dict[str, BaseInterface]:
        """Retourne toutes les interfaces disponibles pour une recherche exhaustive."""
        return self._instances
    
    def get_interface_by_name(self, domain_name: str) -> BaseInterface:
        """
        Retourne une interface par son nom de domaine.
        Utile pour forcer un domaine spécifique.
        """
        return self._instances.get(domain_name, self._instances.get("knowledge"))
    
    def get_all_domains(self) -> List[str]:
        """Liste tous les domaines disponibles."""
        return list(self._instances.keys())
    
    async def close_all(self):
        """Ferme proprement tous les clients HTTP des interfaces."""
        for instance in self._instances.values():
            await instance.close()
        logger.info("🧹 All interfaces closed")


# Singleton global
interface_factory = InterfaceFactory()
