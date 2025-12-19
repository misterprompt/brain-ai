"""
🚀 SMART AI STREAMING PIPELINE v1
==================================
Architecture "Intention First" avec:
- Routeur IA (classification de requête en <200ms)
- Streaming RAG (synthèse progressive)
- Reranker sémantique (scoring IA)

Flux:
1. Intent Router → Sélectionne les APIs pertinentes
2. Priority Fetch → APIs rapides d'abord, lentes après
3. Streaming Synthesis → Écrit au fur et à mesure
4. Semantic Rerank → Score les résultats avec IA
"""

import asyncio
import json
import logging
import time
import hashlib
from datetime import datetime
from typing import Dict, List, Any, Optional, AsyncGenerator, Tuple
from urllib.parse import quote
import httpx

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

# APIs groupées par vitesse de réponse (empirique)
FAST_APIS = ["pubmed", "arxiv", "europe_pmc", "doaj", "wikipedia", "duckduckgo"]
MEDIUM_APIS = ["crossref", "semantic_scholar", "core", "openlibrary", "google_books"]
SLOW_APIS = ["fda", "cdc", "who", "clinicaltrials", "world_bank"]

# Mapping domaine → catégories API
DOMAIN_TO_CATEGORIES = {
    "health": ["academic", "official_health", "books"],
    "finance": ["academic", "statistics", "web"],
    "tech": ["academic", "web", "books"],
    "entertainment": ["web", "books"],
    "general": ["academic", "official_health", "books", "web"],
}

# Prompt système pour le routeur
INTENT_ROUTER_PROMPT = """Tu es un classificateur de requêtes ultra-rapide.

TÂCHE: Analyse la requête utilisateur et retourne un JSON avec:
1. "domain": le domaine principal (health, finance, tech, entertainment, science, general)
2. "categories": liste des catégories API à activer (academic, official_health, statistics, books, web)
3. "priority_keywords": 3-5 mots-clés essentiels pour scorer les résultats
4. "exclude": catégories à NE PAS appeler (pour économiser du temps)

RÈGLES:
- Si requête médicale → active "official_health" + "academic"
- Si requête finance/crypto → active "statistics" + "web"
- Si requête tech/code → active "academic" + "web"
- JAMAIS activer plus de 3 catégories (performance)

REQUÊTE: "{query}"

Réponds UNIQUEMENT en JSON valide, rien d'autre:"""


# ══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 1: INTENT ROUTER (Classification IA rapide)
# ══════════════════════════════════════════════════════════════════════════════

async def classify_intent(query: str, llm_client) -> Dict[str, Any]:
    """
    Utilise un LLM rapide pour classifier l'intention de la requête.
    Retourne un plan d'exécution (quelles APIs appeler).
    
    Objectif: < 200ms
    """
    start = time.time()
    
    try:
        prompt = INTENT_ROUTER_PROMPT.format(query=query)
        
        # Appel LLM ultra-rapide (Groq Llama-3-8b ou similar)
        response = await llm_client.generate(
            prompt=prompt,
            max_tokens=200,
            temperature=0.1  # Très déterministe
        )
        
        # Parser le JSON
        intent = json.loads(response.strip())
        
        elapsed = int((time.time() - start) * 1000)
        logger.info(f"🎯 Intent Router: {intent['domain']} in {elapsed}ms")
        
        return {
            "domain": intent.get("domain", "general"),
            "categories": intent.get("categories", ["academic", "web"]),
            "priority_keywords": intent.get("priority_keywords", query.split()[:3]),
            "exclude": intent.get("exclude", []),
            "elapsed_ms": elapsed
        }
        
    except Exception as e:
        logger.warning(f"Intent Router fallback: {e}")
        # Fallback: classification par mots-clés
        return fallback_intent_classification(query)


def fallback_intent_classification(query: str) -> Dict[str, Any]:
    """Classification par mots-clés si LLM échoue."""
    query_lower = query.lower()
    
    # Health keywords
    if any(w in query_lower for w in ["cancer", "diabète", "diabetes", "maladie", "traitement", "symptome", "medical", "santé"]):
        return {"domain": "health", "categories": ["academic", "official_health"], "priority_keywords": query.split()[:3], "exclude": ["entertainment", "sports"]}
    
    # Finance keywords
    if any(w in query_lower for w in ["bitcoin", "crypto", "bourse", "investir", "action", "finance", "économie"]):
        return {"domain": "finance", "categories": ["statistics", "web", "academic"], "priority_keywords": query.split()[:3], "exclude": ["health", "entertainment"]}
    
    # Tech keywords
    if any(w in query_lower for w in ["python", "javascript", "code", "algorithm", "machine learning", "ai", "api"]):
        return {"domain": "tech", "categories": ["academic", "web"], "priority_keywords": query.split()[:3], "exclude": ["health", "finance"]}
    
    # Default
    return {"domain": "general", "categories": ["academic", "web", "books"], "priority_keywords": query.split()[:3], "exclude": []}


# ══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2: PRIORITY STREAMING FETCH
# ══════════════════════════════════════════════════════════════════════════════

async def priority_stream_fetch(
    query: str,
    intent: Dict[str, Any],
    api_registry: Dict,
    on_batch_ready: callable
) -> AsyncGenerator[Dict, None]:
    """
    Fetch les APIs par ordre de priorité (rapides d'abord).
    Yield les résultats dès qu'ils arrivent (streaming).
    
    Flow:
    1. Lance les FAST APIs
    2. Dès qu'elles répondent → yield + trigger partial synthesis
    3. Lance les MEDIUM APIs
    4. Yield les nouveaux résultats
    5. Lance les SLOW APIs (optionnel selon le temps restant)
    """
    categories_to_fetch = intent.get("categories", ["academic"])
    all_results = []
    
    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 1: FAST APIs (< 1s expected)
    # ─────────────────────────────────────────────────────────────────────────
    fast_apis = [api for name, api in api_registry.items() 
                 if name in FAST_APIS and api.get("category") in categories_to_fetch]
    
    if fast_apis:
        fast_start = time.time()
        fast_results = await fetch_api_batch(fast_apis, query, timeout=2.0)
        all_results.extend(fast_results)
        
        yield {
            "phase": "fast",
            "results": fast_results,
            "count": len(fast_results),
            "elapsed_ms": int((time.time() - fast_start) * 1000),
            "total_so_far": len(all_results)
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 2: MEDIUM APIs (1-3s expected)
    # ─────────────────────────────────────────────────────────────────────────
    medium_apis = [api for name, api in api_registry.items() 
                   if name in MEDIUM_APIS and api.get("category") in categories_to_fetch]
    
    if medium_apis:
        medium_start = time.time()
        medium_results = await fetch_api_batch(medium_apis, query, timeout=4.0)
        all_results.extend(medium_results)
        
        yield {
            "phase": "medium",
            "results": medium_results,
            "count": len(medium_results),
            "elapsed_ms": int((time.time() - medium_start) * 1000),
            "total_so_far": len(all_results)
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 3: SLOW APIs (3-10s expected) - Skip if we have enough
    # ─────────────────────────────────────────────────────────────────────────
    if len(all_results) < 20:  # Only fetch slow APIs if we need more
        slow_apis = [api for name, api in api_registry.items() 
                     if name in SLOW_APIS and api.get("category") in categories_to_fetch]
        
        if slow_apis:
            slow_start = time.time()
            slow_results = await fetch_api_batch(slow_apis, query, timeout=8.0)
            all_results.extend(slow_results)
            
            yield {
                "phase": "slow",
                "results": slow_results,
                "count": len(slow_results),
                "elapsed_ms": int((time.time() - slow_start) * 1000),
                "total_so_far": len(all_results)
            }
    
    # Final yield avec tous les résultats
    yield {
        "phase": "complete",
        "results": all_results,
        "count": len(all_results),
        "total_so_far": len(all_results)
    }


async def fetch_api_batch(apis: List[Dict], query: str, timeout: float) -> List[Dict]:
    """Fetch un batch d'APIs en parallèle avec timeout."""
    async def fetch_one(api: Dict) -> List[Dict]:
        try:
            url = api["url"].format(query=quote(query))
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(url, follow_redirects=True)
                if resp.status_code == 200:
                    return [{
                        "id": hashlib.md5(url.encode()).hexdigest()[:12],
                        "title": f"Result from {api.get('name', 'Unknown')}",
                        "url": url,
                        "snippet": resp.text[:500] if resp.text else "",
                        "provider": api.get("name", "Unknown"),
                        "source_type": api.get("source_type", "web"),
                        "timestamp": datetime.now().strftime("%Y-%m-%d"),
                    }]
        except Exception as e:
            logger.debug(f"API {api.get('name')} error: {e}")
        return []
    
    tasks = [fetch_one(api) for api in apis]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Flatten
    flat = []
    for r in results:
        if isinstance(r, list):
            flat.extend(r)
    return flat


# ══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3: STREAMING SYNTHESIS (Synthèse Progressive)
# ══════════════════════════════════════════════════════════════════════════════

STREAMING_SYNTHESIS_PROMPT = """Tu es un assistant de recherche académique.

CONTEXTE ACTUEL (sources reçues jusqu'à présent):
{context}

REQUÊTE: "{query}"

INSTRUCTION:
{instruction}

Réponds directement, de manière concise et factuelle."""


async def streaming_synthesis(
    query: str,
    llm_client,
    initial_results: List[Dict],
    phase: str = "intro"
) -> str:
    """
    Génère une synthèse partielle basée sur les résultats disponibles.
    
    Phases:
    - "intro": Écrit l'introduction et le contexte général
    - "develop": Développe avec les nouvelles sources
    - "conclude": Conclusion finale avec toutes les sources
    """
    
    # Construire le contexte à partir des snippets
    context = "\n".join([
        f"[{i+1}] {r.get('provider', '?')}: {r.get('snippet', '')[:200]}"
        for i, r in enumerate(initial_results[:15])  # Max 15 sources pour le prompt
    ])
    
    instructions = {
        "intro": "Écris une introduction de 2-3 phrases présentant le sujet et ce que montrent les premières sources.",
        "develop": "Développe l'analyse avec les nouvelles informations. Ajoute des détails factuels.",
        "conclude": "Fournis une synthèse complète et une conclusion basée sur toutes les sources."
    }
    
    prompt = STREAMING_SYNTHESIS_PROMPT.format(
        context=context,
        query=query,
        instruction=instructions.get(phase, instructions["develop"])
    )
    
    try:
        response = await llm_client.generate(
            prompt=prompt,
            max_tokens=500 if phase == "intro" else 1000,
            temperature=0.3
        )
        return response.strip()
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        return f"[Synthèse en cours - {len(initial_results)} sources analysées]"


# ══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4: SEMANTIC RERANKER (Scoring IA)
# ══════════════════════════════════════════════════════════════════════════════

RERANKER_PROMPT = """Évalue la pertinence de cette source pour la requête.

REQUÊTE: "{query}"
SOURCE: "{snippet}"

Score de 0 à 100:
- 0-20: Hors sujet
- 21-50: Tangentiellement lié
- 51-80: Pertinent
- 81-100: Très pertinent

Réponds UNIQUEMENT avec un nombre entre 0 et 100:"""


async def semantic_rerank(
    query: str,
    results: List[Dict],
    llm_client,
    top_k: int = 20
) -> List[Dict]:
    """
    Utilise un LLM pour scorer la pertinence sémantique de chaque résultat.
    Retourne les top_k résultats triés par score.
    """
    
    async def score_one(result: Dict) -> Tuple[Dict, int]:
        try:
            prompt = RERANKER_PROMPT.format(
                query=query,
                snippet=result.get("snippet", "")[:300]
            )
            
            response = await llm_client.generate(
                prompt=prompt,
                max_tokens=10,
                temperature=0
            )
            
            score = int(response.strip())
            result["semantic_score"] = score
            return (result, score)
            
        except Exception:
            result["semantic_score"] = 50  # Default
            return (result, 50)
    
    # Score en parallèle (avec limite de concurrence)
    semaphore = asyncio.Semaphore(10)
    
    async def limited_score(result):
        async with semaphore:
            return await score_one(result)
    
    scored = await asyncio.gather(*[limited_score(r) for r in results[:30]])
    
    # Trier par score et retourner top_k
    sorted_results = sorted(scored, key=lambda x: x[1], reverse=True)
    return [r[0] for r in sorted_results[:top_k]]


# ══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATEUR PRINCIPAL: SMART PIPELINE
# ══════════════════════════════════════════════════════════════════════════════

async def smart_pipeline_generator(
    query: str,
    lang: str = "fr",
    llm_client = None,
    api_registry: Dict = None
) -> AsyncGenerator[Dict, None]:
    """
    Générateur SSE du Smart Pipeline.
    
    Flow complet:
    1. yield "intent" → Classification IA de la requête
    2. yield "fast_results" → Premiers résultats (APIs rapides)
    3. yield "partial_synthesis" → Introduction basée sur fast_results
    4. yield "medium_results" → Résultats supplémentaires
    5. yield "updated_synthesis" → Synthèse enrichie
    6. yield "slow_results" → Résultats lents (si nécessaire)
    7. yield "reranked" → Résultats re-scorés sémantiquement
    8. yield "final_synthesis" → Synthèse complète
    9. yield "complete" → Fin
    """
    start_time = time.time()
    all_results = []
    synthesis_parts = []
    
    # ═══════════════════════════════════════════════════════════════════════
    # PHASE 1: INTENT CLASSIFICATION
    # ═══════════════════════════════════════════════════════════════════════
    intent = await classify_intent(query, llm_client) if llm_client else fallback_intent_classification(query)
    
    yield {
        "type": "intent",
        "data": intent
    }
    
    # ═══════════════════════════════════════════════════════════════════════
    # PHASE 2: STREAMING FETCH + PARTIAL SYNTHESIS
    # ═══════════════════════════════════════════════════════════════════════
    if api_registry:
        async for batch in priority_stream_fetch(query, intent, api_registry, None):
            phase = batch["phase"]
            results = batch["results"]
            all_results.extend(results)
            
            # Yield les résultats de cette phase
            yield {
                "type": f"{phase}_results",
                "data": {
                    "count": batch["count"],
                    "total": batch["total_so_far"],
                    "elapsed_ms": batch.get("elapsed_ms", 0),
                    "providers": list(set(r.get("provider") for r in results))
                }
            }
            
            # Synthèse partielle après les fast results
            if phase == "fast" and llm_client and results:
                intro = await streaming_synthesis(query, llm_client, results, "intro")
                synthesis_parts.append(intro)
                
                yield {
                    "type": "partial_synthesis",
                    "data": {
                        "phase": "intro",
                        "text": intro
                    }
                }
            
            # Mise à jour après medium results
            elif phase == "medium" and llm_client and results:
                update = await streaming_synthesis(query, llm_client, all_results, "develop")
                synthesis_parts.append(update)
                
                yield {
                    "type": "updated_synthesis",
                    "data": {
                        "phase": "develop",
                        "text": update
                    }
                }
    
    # ═══════════════════════════════════════════════════════════════════════
    # PHASE 3: SEMANTIC RERANKING
    # ═══════════════════════════════════════════════════════════════════════
    if llm_client and all_results:
        reranked = await semantic_rerank(query, all_results, llm_client, top_k=20)
        
        yield {
            "type": "reranked",
            "data": {
                "top_results": [
                    {"title": r.get("title"), "score": r.get("semantic_score", 0), "provider": r.get("provider")}
                    for r in reranked[:10]
                ]
            }
        }
        
        # Synthèse finale avec les meilleurs résultats
        final = await streaming_synthesis(query, llm_client, reranked, "conclude")
        
        yield {
            "type": "final_synthesis",
            "data": {
                "text": final,
                "sources_used": len(reranked),
                "total_sources": len(all_results)
            }
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    # COMPLETE
    # ═══════════════════════════════════════════════════════════════════════
    yield {
        "type": "complete",
        "data": {
            "total_time_ms": int((time.time() - start_time) * 1000),
            "total_sources": len(all_results),
            "phases_completed": ["intent", "fast", "medium", "slow", "rerank", "synthesis"]
        }
    }


# ══════════════════════════════════════════════════════════════════════════════
# HELPER: SSE FORMATTER
# ══════════════════════════════════════════════════════════════════════════════

def sse(event_type: str, data: Any) -> str:
    """Formate un événement SSE."""
    return f"data: {json.dumps({'type': event_type, 'data': data}, ensure_ascii=False)}\n\n"
