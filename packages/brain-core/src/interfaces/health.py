"""
🏥 HEALTH INTERFACE
===================
Gère la santé : Médicaments, Symptômes, Maladies.
PubMed, OpenFDA, ClinicalTrials.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from urllib.parse import quote
import re

from .base import BaseInterface


class HealthInterface(BaseInterface):
    """
    Expert Santé : Informations médicales.
    DISCLAIMER: Informations éducatives uniquement.
    """
    
    DOMAIN_NAME = "health"
    
    KEYWORDS = [
        "santé", "health", "médecin", "doctor", "maladie", "disease", "illness",
        "symptôme", "symptome", "symptom", "douleur", "pain", "mal",
        "médicament", "medicament", "medicine", "drug", "traitement", "treatment",
        "vaccin", "vaccine", "grippe", "flu", "covid", "virus", "infection",
        "allergie", "allergy", "diabète", "diabetes", "cancer", "coeur", "heart"
    ]
    
    PATTERNS = [
        r"\b(symptôme|symptome|symptom)s?\s+(de|du|d[e'])\b",
        r"\b(traitement|treatment)\s+(pour|for|contre)\b",
        r"\b(mal|douleur)\s+(de|à|au|aux)\s+\w+\b",
        r"\b(médicament|medicament|medicine)\s+\w+\b",
    ]
    
    DISCLAIMER = "⚠️ Ces informations sont éducatives. Consultez un professionnel de santé."
    
    def extract_params(self, query: str) -> Dict[str, Any]:
        """Extrait le terme médical principal."""
        # Nettoyage basique
        clean_q = query.lower()
        
        # Chercher si un mot clé connu est présent
        detected_term = None
        for kw in self.KEYWORDS:
            if kw in clean_q:
                detected_term = kw
                # Mapping simple FR -> EN pour meilleures chances
                if kw == "diabète": detected_term = "diabetes"
                if kw == "coeur": detected_term = "heart"
                if kw == "symptôme": detected_term = "symptom"
                if kw == "médicament": detected_term = "drug"
                if kw == "traitement": detected_term = "treatment"
                break
        
        # Si on a trouvé un terme précis, on l'utilise
        search_term = detected_term if detected_term else query
        
        return {
            "query": query,
            "search_term": quote(search_term)
        }
    
    async def fetch_speed_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mode Speed : OpenFDA (médicaments)."""
        start = datetime.now()
        
        search_term = params.get("search_term", quote(query))
        
        # OpenFDA : recherche de médicaments
        url = f"https://api.fda.gov/drug/label.json?search={search_term}&limit=3"
        
        data = await self._fetch_json(url, timeout=self.SPEED_TIMEOUT)
        
        if not data or "results" not in data:
            # Fallback: PubMed
            pubmed_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={search_term}&retmax=5&retmode=json"
            pubmed = await self._fetch_json(pubmed_url, timeout=self.SPEED_TIMEOUT)
            
            if pubmed and pubmed.get("esearchresult", {}).get("idlist"):
                ids = pubmed["esearchresult"]["idlist"]
                return self._build_response(
                    success=True,
                    data={"pubmed_ids": ids},
                    context=f"🏥 RECHERCHE MÉDICALE:\n{self.DISCLAIMER}\n\n{len(ids)} articles PubMed trouvés pour '{query}'.",
                    sources=["PubMed"],
                    start_time=start
                )
            
            return self._build_response(
                success=False,
                data={},
                context=f"{self.DISCLAIMER}\n\nAucune donnée trouvée pour cette recherche médicale.",
                sources=[],
                start_time=start
            )
        
        context_lines = [f"🏥 INFORMATIONS MÉDICALES:\n{self.DISCLAIMER}\n"]
        
        for result in data.get("results", [])[:3]:
            brand = result.get("openfda", {}).get("brand_name", ["N/A"])[0]
            generic = result.get("openfda", {}).get("generic_name", ["N/A"])[0]
            purpose = result.get("purpose", [""])[0][:100] if result.get("purpose") else ""
            
            context_lines.append(f"💊 {brand} ({generic})")
            if purpose:
                context_lines.append(f"   Usage: {purpose}")
        
        return self._build_response(
            success=True,
            data=data,
            context="\n".join(context_lines),
            sources=["OpenFDA"],
            start_time=start
        )
    
    async def fetch_deep_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mode Deep : OpenFDA + PubMed + ClinicalTrials."""
        start = datetime.now()
        
        search_term = params.get("search_term", quote(query))
        
        urls = [
            f"https://api.fda.gov/drug/label.json?search={search_term}&limit=5",
            f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={search_term}&retmax=10&retmode=json",
            f"https://clinicaltrials.gov/api/v2/studies?query.term={search_term}&pageSize=5",
        ]
        
        results = await self._fetch_multiple(urls, timeout=self.DEEP_TIMEOUT)
        
        sources = []
        aggregated = {}
        
        if results[0] and results[0].get("results"):
            sources.append("OpenFDA")
            aggregated["fda"] = results[0]["results"]
        
        if results[1] and results[1].get("esearchresult", {}).get("idlist"):
            sources.append("PubMed")
            aggregated["pubmed"] = results[1]["esearchresult"]
        
        if results[2] and results[2].get("studies"):
            sources.append("ClinicalTrials")
            aggregated["trials"] = results[2]["studies"]
        
        context_parts = [f"🏥 RECHERCHE MÉDICALE APPROFONDIE:\n{self.DISCLAIMER}\n"]
        
        # FDA
        if aggregated.get("fda"):
            context_parts.append("💊 MÉDICAMENTS (FDA):")
            for drug in aggregated["fda"][:3]:
                brand = drug.get("openfda", {}).get("brand_name", ["?"])[0]
                context_parts.append(f"   • {brand}")
        
        # PubMed
        if aggregated.get("pubmed"):
            count = aggregated["pubmed"].get("count", 0)
            context_parts.append(f"\n📚 RECHERCHE PUBMED: {count} articles trouvés")
        
        # Trials
        if aggregated.get("trials"):
            context_parts.append(f"\n🔬 ESSAIS CLINIQUES: {len(aggregated['trials'])} études en cours")
        
        return self._build_response(
            success=len(sources) > 0,
            data=aggregated,
            context="\n".join(context_parts),
            sources=sources,
            start_time=start
        )
