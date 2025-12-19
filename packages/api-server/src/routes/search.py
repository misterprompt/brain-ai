"""
🔍 SEARCH ENDPOINT - Simple & Clean + Local
============================================
5-7 résultats web + résultats locaux si pertinent + résumé.
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import asyncio
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/api/v6/search")
async def search(q: str, request: Request, lang: str = "auto"):
    """
    Recherche simple et efficace:
    - 5-7 meilleurs résultats web (titre, URL, description)
    - Résultats locaux si requête locale détectée
    - Résumé 7-10 lignes dans la langue de l'utilisateur
    """
    if not q or len(q.strip()) < 2:
        return JSONResponse({"error": "Requête trop courte"}, status_code=400)
    
    try:
        # Récupérer l'IP client pour la localisation
        client_ip = request.client.host if request.client else None
        # Si derrière un proxy (Fly.io, Netlify), utiliser X-Forwarded-For
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # ═══════════════════════════════════════════════════════════════════
        # 1. RECHERCHE WEB + LOCALE EN PARALLÈLE
        # ═══════════════════════════════════════════════════════════════════
        from services.smart_search_v7 import smart_search_v7
        from services.local_search import enrich_query_with_local, is_local_query
        
        # Vérifier si c'est une requête locale
        local_detection = is_local_query(q)
        
        # Lancer les recherches en parallèle
        tasks = [
            asyncio.wait_for(smart_search_v7.search(q, lang="fr"), timeout=5.0)
        ]
        
        # Ajouter recherche locale si pertinent
        if local_detection["is_local"]:
            tasks.append(
                asyncio.wait_for(
                    enrich_query_with_local(q, client_ip),
                    timeout=3.0
                )
            )
        
        # Exécuter en parallèle
        task_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Extraire les résultats
        search_result = task_results[0] if not isinstance(task_results[0], Exception) else {"links": []}
        local_data = None
        if len(task_results) > 1 and not isinstance(task_results[1], Exception):
            local_data = task_results[1]
        
        # ═══════════════════════════════════════════════════════════════════
        # 2. FORMATER LES RÉSULTATS WEB
        # ═══════════════════════════════════════════════════════════════════
        results = []
        links = search_result.get("links", [])[:7]
        
        for link in links:
            if len(results) >= 7:
                break
            results.append({
                "title": link.get("title", "Sans titre"),
                "url": link.get("url", ""),
                "description": (link.get("snippet") or link.get("content") or "")[:150],
                "type": "web"
            })
        
        # ═══════════════════════════════════════════════════════════════════
        # 3. AJOUTER LES RÉSULTATS LOCAUX
        # ═══════════════════════════════════════════════════════════════════
        local_results = []
        location_info = None
        
        if local_data and local_data.get("is_local"):
            location_info = local_data.get("location", {})
            local_places = local_data.get("local_places", [])
            
            for place in local_places[:5]:
                local_results.append({
                    "name": place.get("name", ""),
                    "address": place.get("address", ""),
                    "distance_km": place.get("distance_km", 0),
                    "type": place.get("type", "lieu"),
                    "lat": place.get("lat"),
                    "lon": place.get("lon"),
                    "source": "openstreetmap"
                })
        
        # ═══════════════════════════════════════════════════════════════════
        # 4. RÉSUMÉ IA (inclut les infos locales si présentes)
        # ═══════════════════════════════════════════════════════════════════
        summary = ""
        if results or local_results:
            try:
                from services.ai_router import ai_router
                
                # Contexte des résultats web
                web_context = "\n".join([
                    f"{i+1}. {r['title']}: {r['description']}"
                    for i, r in enumerate(results)
                ])
                
                # Contexte local
                local_context = ""
                if local_results:
                    city = location_info.get("city", "") if location_info else ""
                    local_context = f"\n\nRésultats locaux à {city}:\n"
                    local_context += "\n".join([
                        f"- {r['name']} ({r['address']}, ~{r['distance_km']} km)"
                        for r in local_results
                    ])
                
                prompt = f"""Recherche: "{q}"

Résultats web:
{web_context}
{local_context}

Fais un résumé en 7 à 10 lignes maximum.
- Explique ce qu'on trouve sur ce sujet
- Si des lieux locaux sont mentionnés, indique-les avec leurs adresses
- Réponds dans la MÊME LANGUE que la question
- Style fluide et naturel, pas académique"""

                ai_result = await ai_router.route(
                    prompt=prompt,
                    system_prompt="Tu résumes des résultats de recherche. Court, clair, dans la langue de l'utilisateur. Mentionne les lieux locaux si pertinent.",
                    preferred_provider="mistral",
                    max_tokens=400
                )
                
                summary = ai_result.get("response", "")
                
            except Exception as e:
                logger.error(f"Erreur résumé: {e}")
        
        # ═══════════════════════════════════════════════════════════════════
        # 5. EXTRAIRE LES IMAGES
        # ═══════════════════════════════════════════════════════════════════
        images = search_result.get("images", [])
        
        # ═══════════════════════════════════════════════════════════════════
        # 6. RÉPONSE
        # ═══════════════════════════════════════════════════════════════════
        return {
            "success": True,
            "query": q,
            "results": results,
            "images": images,
            "count": len(results),
            "summary": summary,
            # Infos locales
            "is_local_query": local_detection["is_local"],
            "local_results": local_results,
            "location": {
                "city": location_info.get("city") if location_info else None,
                "detected": bool(location_info)
            } if local_detection["is_local"] else None
        }
        
    except asyncio.TimeoutError:
        return JSONResponse({"error": "Timeout"}, status_code=504)
    except Exception as e:
        logger.error(f"Erreur recherche: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)
