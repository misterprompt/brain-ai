"""
🚀 SMART DEEP SEARCH ENDPOINT v1
=================================
Endpoint FastAPI utilisant le Smart AI Pipeline.

Différences avec l'ancien endpoint:
- Intent Router IA au lieu de force brute
- Streaming progressif (synthèse partielle)
- Reranking sémantique
"""

import asyncio
import json
import logging
import time
from typing import AsyncGenerator

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from services.smart_pipeline import (
    smart_pipeline_generator,
    classify_intent,
    fallback_intent_classification,
    sse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/smart", tags=["Smart Search"])


# ══════════════════════════════════════════════════════════════════════════════
# LLM CLIENT WRAPPER (simplifié pour l'exemple)
# ══════════════════════════════════════════════════════════════════════════════

class SimpleLLMClient:
    """Client LLM simplifié utilisant Groq."""
    
    def __init__(self):
        import os
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama-3.1-8b-instant"  # Ultra rapide pour le routeur
    
    async def generate(self, prompt: str, max_tokens: int = 500, temperature: float = 0.3) -> str:
        import httpx
        
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not set")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": temperature
                }
            )
            
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                raise Exception(f"LLM error: {resp.status_code}")


# ══════════════════════════════════════════════════════════════════════════════
# API REGISTRY SIMPLIFIÉ (pour le smart pipeline)
# ══════════════════════════════════════════════════════════════════════════════

SMART_API_REGISTRY = {
    # FAST APIs (< 1s)
    "pubmed": {
        "name": "PubMed",
        "url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={query}&retmax=5&retmode=json",
        "category": "academic",
        "source_type": "peer_reviewed"
    },
    "arxiv": {
        "name": "ArXiv",
        "url": "http://export.arxiv.org/api/query?search_query=all:{query}&max_results=5",
        "category": "academic",
        "source_type": "preprint"
    },
    "europe_pmc": {
        "name": "Europe PMC",
        "url": "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={query}&format=json&pageSize=5",
        "category": "academic",
        "source_type": "peer_reviewed"
    },
    "doaj": {
        "name": "DOAJ",
        "url": "https://doaj.org/api/search/articles/{query}?pageSize=5",
        "category": "academic",
        "source_type": "peer_reviewed"
    },
    "wikipedia": {
        "name": "Wikipedia",
        "url": "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&format=json&srlimit=5",
        "category": "web",
        "source_type": "encyclopedia"
    },
    
    # MEDIUM APIs (1-3s)
    "crossref": {
        "name": "CrossRef",
        "url": "https://api.crossref.org/works?query={query}&rows=5",
        "category": "academic",
        "source_type": "peer_reviewed"
    },
    "semantic_scholar": {
        "name": "Semantic Scholar",
        "url": "https://api.semanticscholar.org/graph/v1/paper/search?query={query}&limit=5&fields=title,abstract,url",
        "category": "academic",
        "source_type": "peer_reviewed"
    },
    "openlibrary": {
        "name": "OpenLibrary",
        "url": "https://openlibrary.org/search.json?q={query}&limit=5",
        "category": "books",
        "source_type": "book"
    },
    "google_books": {
        "name": "Google Books",
        "url": "https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=5",
        "category": "books",
        "source_type": "book"
    },
    
    # SLOW APIs (3-10s)
    "fda": {
        "name": "FDA",
        "url": "https://api.fda.gov/drug/label.json?search={query}&limit=3",
        "category": "official_health",
        "source_type": "official"
    },
    "clinicaltrials": {
        "name": "ClinicalTrials",
        "url": "https://clinicaltrials.gov/api/v2/studies?query.term={query}&pageSize=3",
        "category": "official_health",
        "source_type": "official"
    },
    "cdc": {
        "name": "CDC",
        "url": "https://tools.cdc.gov/api/v2/resources/media?q={query}&max=3",
        "category": "official_health",
        "source_type": "official"
    },
    
    # FINANCE
    "coingecko": {
        "name": "CoinGecko",
        "url": "https://api.coingecko.com/api/v3/search?query={query}",
        "category": "statistics",
        "source_type": "data"
    },
    "world_bank": {
        "name": "World Bank",
        "url": "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=5",
        "category": "statistics",
        "source_type": "data"
    }
}


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: SMART DEEP SEARCH
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/deep-search")
async def smart_deep_search(
    q: str = Query(..., min_length=2, max_length=500, description="Search query"),
    lang: str = Query("fr", description="Language"),
    use_ai: bool = Query(True, description="Enable AI features (intent, rerank)")
):
    """
    🚀 Smart Deep Search with AI Pipeline
    
    Features:
    - Intent Router (AI classifies query to select relevant APIs)
    - Priority Fetch (fast APIs first, then slow)
    - Streaming Synthesis (partial results sent immediately)
    - Semantic Reranking (AI scores relevance)
    
    SSE Events:
    - intent: Query classification result
    - fast_results: Results from fast APIs
    - partial_synthesis: Introduction based on fast results
    - medium_results: Results from medium APIs
    - updated_synthesis: Enriched synthesis
    - slow_results: Results from slow APIs
    - reranked: Top results after semantic scoring
    - final_synthesis: Complete synthesis
    - complete: Pipeline finished
    """
    
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Initialize LLM client if AI enabled
            llm_client = SimpleLLMClient() if use_ai else None
            
            # Run the smart pipeline
            async for event in smart_pipeline_generator(
                query=q,
                lang=lang,
                llm_client=llm_client,
                api_registry=SMART_API_REGISTRY
            ):
                yield sse(event["type"], event["data"])
                
        except Exception as e:
            logger.error(f"Smart pipeline error: {e}")
            yield sse("error", {"message": str(e)})
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: INTENT ONLY (pour debug)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/intent")
async def get_intent(q: str = Query(..., min_length=2)):
    """
    Test the Intent Router only.
    Returns the classification for a query without running the full pipeline.
    """
    try:
        llm_client = SimpleLLMClient()
        intent = await classify_intent(q, llm_client)
        return {"query": q, "intent": intent}
    except Exception as e:
        # Fallback
        intent = fallback_intent_classification(q)
        return {"query": q, "intent": intent, "fallback": True, "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# EXPORT
# ══════════════════════════════════════════════════════════════════════════════

smart_router = router
