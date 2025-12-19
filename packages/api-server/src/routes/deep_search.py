# -*- coding: utf-8 -*-
"""
🔍 DEEP SEARCH v9 - Recherche Approfondie Académique
=====================================================
Version complètement refondée avec:
- Orchestration multi-API parallèle
- Scoring transparent avec sous-scores
- Synthèse stricte avec citations inline
- Tableau académique
- FAQ sourcée
- Badge requires_human_review

Critères d'acceptation:
- Diversité des providers > 10 par requête
- Snippets visibles pour chaque affirmation
- Tableau académique présent et complet
- Score expliqué avec sous-scores
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, AsyncGenerator
from urllib.parse import quote

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

# Imports internes
from services.multi_api_orchestrator import (
    orchestrate_search,
    calculate_confidence_v7,
    cluster_by_theme
)
from services.api_registry import Category, get_categories_summary
from services.ai_router import ai_router
from services.content_filter import filter_search_results

logger = logging.getLogger(__name__)
router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTES & CRITÈRES D'ACCEPTATION
# ══════════════════════════════════════════════════════════════════════════════

MIN_PROVIDERS_TARGET = 12  # Objectif: ≥12 providers distincts
MIN_PEER_REVIEW = 6        # ≥6 peer-review/éditeurs
MIN_OFFICIAL = 4           # ≥4 sources officielles
MAX_SOURCES_FOR_SYNTHESIS = 30
MAX_BOOKS_VISIBLE = 2      # Livres masqués par défaut (max 2)

# Quotas par domaine détecté
CATEGORY_QUOTAS = {
    "health": {"academic": 5, "official": 5, "books": 2},
    "ai_ml": {"academic": 5, "official": 2, "books": 1},
    "general": {"academic": 4, "official": 3, "books": 2}
}

# Seuils de revue humaine
HUMAN_REVIEW_THRESHOLDS = {
    "min_score": 70,
    "min_providers": 10,
    "min_peer_review_ratio": 0.30,
    "max_preprint_ratio": 0.50
}


# ══════════════════════════════════════════════════════════════════════════════
# DÉTECTION DE LANGUE
# ══════════════════════════════════════════════════════════════════════════════

def detect_language(query: str) -> str:
    """Détecte la langue de la requête."""
    q_lower = query.lower()
    
    # Français
    french_markers = ["qu'est-ce", "comment", "pourquoi", "où", "quand", "quel", "est-ce", 
                      "le", "la", "les", "un", "une", "des", "du", "de", "à", "en"]
    french_score = sum(1 for m in french_markers if m in q_lower)
    
    # Anglais
    english_markers = ["what", "how", "why", "where", "when", "which", "the", "is", "are", "of"]
    english_score = sum(1 for m in english_markers if m in q_lower)
    
    if french_score > english_score:
        return "fr"
    elif english_score > french_score:
        return "en"
    
    # Hébreu
    if any('\u0590' <= c <= '\u05FF' for c in query):
        return "he"
    
    # Arabe
    if any('\u0600' <= c <= '\u06FF' for c in query):
        return "ar"
    
    return "fr"  # Défaut


def detect_domain(query: str) -> str:
    """Détecte le domaine de la requête pour appliquer les quotas."""
    q_lower = query.lower()
    
    # Termes IA/ML
    ai_terms = ["ai", "ml", "machine learning", "deep learning", "neural", "model", 
                "gym", "openai", "reinforcement", "rl", "transformer", "gpt", "llm",
                "robot", "algorithm", "dataset", "training", "inference", "pytorch",
                "tensorflow", "environment", "agent", "policy"]
    ai_score = sum(1 for t in ai_terms if t in q_lower)
    
    # Termes santé
    health_terms = ["health", "santé", "médical", "medical", "disease", "maladie",
                    "treatment", "traitement", "symptom", "symptôme", "diagnosis",
                    "diagnostic", "patient", "clinical", "clinique", "therapy",
                    "thérapie", "drug", "médicament", "vaccine", "vaccin", "cancer",
                    "vih", "hiv", "sida", "aids", "diabetes", "diabète", "exercise",
                    "fitness", "gym", "workout", "muscle", "nutrition"]
    health_score = sum(1 for t in health_terms if t in q_lower)
    
    # Décision
    if ai_score > health_score and ai_score >= 2:
        return "ai_ml"
    elif health_score > ai_score and health_score >= 2:
        return "health"
    
    return "general"


# ══════════════════════════════════════════════════════════════════════════════
# GÉNÉRATION DU TABLEAU ACADÉMIQUE
# ══════════════════════════════════════════════════════════════════════════════

def generate_academic_table(sources: List[Dict]) -> str:
    """Génère un tableau académique Markdown."""
    if not sources:
        return "| Aucune source académique disponible |"
    
    # En-tête
    table = "| # | Auteur/Source | Année | Type | Provider | URL/DOI |\n"
    table += "|---|---------------|-------|------|----------|----------|\n"
    
    for i, source in enumerate(sources[:15]):  # Max 15 lignes
        idx = i + 1
        
        # Extraire les métadonnées
        metadata = source.get("metadata", {})
        authors = metadata.get("authors", source.get("provider", "N/A"))
        year = metadata.get("year") or source.get("timestamp", "")[:4]
        source_type = source.get("source_type", "N/A")
        provider = source.get("provider", "N/A")
        url = source.get("url", "")
        
        # Tronquer l'URL pour l'affichage
        doi = metadata.get("doi", "")
        if doi:
            display_url = f"[DOI]({url})"
        elif url:
            display_url = f"[Lien]({url[:60]}...)" if len(url) > 60 else f"[Lien]({url})"
        else:
            display_url = "N/A"
        
        # Tronquer les auteurs
        if len(authors) > 30:
            authors = authors[:27] + "..."
        
        row = f"| {idx} | {authors} | {year} | {source_type} | {provider} | {display_url} |\n"
        table += row
    
    return table


# ══════════════════════════════════════════════════════════════════════════════
# GÉNÉRATION DES PREUVES PAR THÈME (avec snippets visibles)
# ══════════════════════════════════════════════════════════════════════════════

def generate_evidence_by_theme(clusters: Dict[str, List[Dict]]) -> str:
    """Génère les preuves organisées par thème avec snippets visibles."""
    output = []
    
    for theme, sources in clusters.items():
        if not sources:
            continue
        
        output.append(f"\n### {theme} ({len(sources)} sources)\n")
        
        for i, source in enumerate(sources[:5]):  # Max 5 par thème
            idx = i + 1
            title = source.get("title", "Sans titre")[:80]
            snippet = source.get("snippet", "")[:300]
            provider = source.get("provider", "N/A")
            url = source.get("url", "")
            confidence = source.get("raw_confidence", 0)
            
            output.append(f"**[{idx}] {title}** ({provider})")
            output.append(f"> {snippet}")
            if url:
                output.append(f"🔗 [Source]({url}) | Confiance: {int(confidence*100)}%")
            output.append("")
    
    return "\n".join(output)


# ══════════════════════════════════════════════════════════════════════════════
# PROMPT DE SYNTHÈSE ACADÉMIQUE
# ══════════════════════════════════════════════════════════════════════════════

def build_synthesis_prompt(query: str, sources: List[Dict]) -> str:
    """Construit le prompt de synthèse VULGARISÉE et accessible au grand public."""
    
    # Numéroter les sources avec contenu pertinent uniquement (pas de métadonnées brutes)
    numbered_sources = []
    for i, source in enumerate(sources[:MAX_SOURCES_FOR_SYNTHESIS]):
        idx = i + 1
        title = source.get("title", "")[:100]
        snippet = source.get("snippet", "")[:500]
        provider = source.get("provider", "N/A")
        
        # Nettoyer le snippet des métadonnées techniques
        clean_snippet = snippet
        for noise in ["DOI:", "Auteurs:", "Authors:", "Éditeur:", "Publisher:", "Article scientifique."]:
            clean_snippet = clean_snippet.replace(noise, "")
        clean_snippet = clean_snippet.strip()
        
        if clean_snippet:  # Ne garder que les sources avec du contenu utile
            numbered_sources.append(
                f"[{idx}] {provider}\n"
                f"   Titre: {title}\n"
                f"   Contenu: \"{clean_snippet}\""
            )
    
    sources_text = "\n\n".join(numbered_sources)
    
    prompt = f"""RECHERCHE APPROFONDIE: "{query}"

════════════════════════════════════════════════════════════════════
📚 SOURCES DISPONIBLES ({len(numbered_sources)} références)
════════════════════════════════════════════════════════════════════
{sources_text}

════════════════════════════════════════════════════════════════════
🎯 MISSION: RAPPORT D'EXPERTISE EXHAUSTIF (DEEP REPORT)
════════════════════════════════════════════════════════════════════

Tu es un CHERCHEUR ANALYSTE travaillant sur un rapport officiel pour des professionnels.
TA MISSION est de synthétiser ces informations pour produire un document de référence COMPLET et DÉTAILLÉ.

📝 CONSIGNES DE RÉDACTION STRICTES:
1. EXHAUSTIVITÉ MAXIMALE : Ne laisse aucun détail technique pertinent de côté.
2. CITATIONS PRÉCISES : Chaque affirmation doit être sourcée avec [X].
3. STRUCTURE CANONIQUE OBLIGATOIRE :
   - 🏢 TITRE ACADÉMIQUE
   - 📌 RÉSUMÉ EXÉCUTIF (L'essentiel pour les décideurs)
   - 📖 CONTEXTE & DÉFINITIONS (Historique, concepts)
   - 🔬 ANALYSE DÉTAILLÉE (Cœur du rapport, sous-sections thématiques)
   - 📊 CHIFFRES CLÉS & DONNÉES (Si disponibles)
   - ⚖️ DISCUSSION / CONTROVERSES (Limites, débats)
   - 🔮 PERSPECTIVES (R&D, futur)
   - 💡 CONCLUSION

4. TON : Expert, neutre, analytique. Pas de vulgarisation excessive.
5. LONGUEUR : VISEZ 3000 MOTS SI POSSIBLE. Développez chaque point.

⚠️ INSTRUCTION CRITIQUE : Ce rapport doit être dense, riche et techniquement précis. Ne résumez pas, DÉVELOPPEZ."""

    return prompt



def build_faq_prompt(query: str, sources: List[Dict]) -> str:
    """Construit le prompt pour une FAQ accessible et vulgarisée."""
    
    snippets = []
    for i, s in enumerate(sources[:10]):
        snippet = s.get('snippet', '')[:200]
        # Nettoyer les métadonnées
        for noise in ["DOI:", "Auteurs:", "Authors:", "Éditeur:", "Publisher:"]:
            snippet = snippet.replace(noise, "")
        if snippet.strip():
            snippets.append(f"[{i+1}] {snippet.strip()}")
    
    snippets_text = "\n".join(snippets)
    
    return f"""Basé sur ces informations sur "{query}":
{snippets_text}

🎯 GÉNÈRE 3 QUESTIONS/RÉPONSES que se poserait un débutant curieux.

📖 RÈGLES:
- Questions SIMPLES que tout le monde peut comprendre
- Réponses CLAIRES sans jargon technique
- Si tu utilises un terme technique, EXPLIQUE-LE
- Ton conversationnel et engageant

FORMAT:

**❓ Q1:** [Question simple et naturelle]
**💬 R1:** [Réponse claire et accessible, 2-3 phrases max] [Source X]

**❓ Q2:** [Question que se poserait quelqu'un qui découvre le sujet]
**💬 R2:** [Réponse pédagogique avec exemple si possible] [Source Y]

**❓ Q3:** [Question pratique "à quoi ça sert" ou "comment ça marche"]
**💬 R3:** [Réponse concrète avec application réelle] [Source Z]

⚠️ ÉVITE: "selon les chercheurs", "la littérature montre", termes académiques."""

# ENDPOINT PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/api/v6/deep-search")
async def deep_search(
    q: str = Query(..., min_length=2, description="La requête de recherche"),
    lang: str = Query("fr", description="Langue de la réponse (fr/en/auto)"),
    mode: str = Query("balanced", description="Mode: speed/balanced/deep")
):
    """
    Endpoint principal de Deep Search V9 (SSE Streaming).
    Orchestre la recherche multi-API, le clustering et la synthèse.
    """
    return StreamingResponse(
        deep_search_generator_v9(q, lang, mode),
        media_type="text/event-stream"
    )

@router.get("/api/deep-search/health")
async def health_check():
    return {"status": "healthy", "service": "deep-search-v9"}


async def deep_search_generator_v9(query: str, lang: str = "fr", mode: str = "balanced") -> AsyncGenerator[str, None]:
    """
    Générateur SSE pour la Deep Search Académique v9.
    
    Ordre strict:
    1. Init
    2. Orchestration multi-API
    3. Déduplication & Clustering
    4. Scoring transparent
    5. Synthèse stricte
    6. Tableau académique
    7. FAQ sourcée
    8. Preuves par thème
    9. Références complètes
    10. Fin
    """
    
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    
    # Détection langue
    if lang == "auto":
        lang = detect_language(query)
    
    # Détection domaine pour quotas
    domain = detect_domain(query)
    quotas = CATEGORY_QUOTAS.get(domain, CATEGORY_QUOTAS["general"])
    
    def sse(event_type: str, data: Any) -> str:
        return f"data: {json.dumps({'type': event_type, 'data': data}, ensure_ascii=False)}\n\n"
    
    try:
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 1: INIT
        # ═══════════════════════════════════════════════════════════════════
        yield sse("init", {
            "request_id": request_id,
            "query": query,
            "lang": lang,
            "domain": domain,
            "quotas": quotas,
            "version": "v10-strict",
            "categories_available": get_categories_summary(),
            "acceptance_criteria": {
                "min_providers": MIN_PROVIDERS_TARGET,
                "min_peer_review": MIN_PEER_REVIEW,
                "min_official": MIN_OFFICIAL
            }
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 1.5: IMAGES (pour faire patienter l'utilisateur)
        # ═══════════════════════════════════════════════════════════════════
        try:
            from services.smart_search_v7 import smart_search_v7
            images = await asyncio.wait_for(
                smart_search_v7.fetch_images(query, max_results=4),
                timeout=3.0
            )
            if images:
                yield sse("images", images)
        except Exception as img_err:
            logger.debug(f"Images fetch failed (non-critical): {img_err}")
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 2: ORCHESTRATION MULTI-API
        # ═══════════════════════════════════════════════════════════════════
        yield sse("stage", {"message": "🚀 Interrogation de toutes les APIs..."})
        
        orchestration_result = await orchestrate_search(query, lang)
        
        sources = orchestration_result.get("sources", [])
        
        # 🛡️ FILTRAGE CONTENU INAPPROPRIÉ
        sources = filter_search_results(sources)
        
        providers_consulted = orchestration_result.get("providers_consulted", [])
        stats = orchestration_result.get("stats", {})
        timings = orchestration_result.get("timings", {})
        by_category = orchestration_result.get("by_category", {})
        
        # Événement orchestration complète
        yield sse("orchestration_done", {
            "total_sources": len(sources),
            "providers_count": len(providers_consulted),
            "providers_list": providers_consulted,
            "by_source_type": stats.get("by_source_type", {}),
            "elapsed_ms": stats.get("total_time_ms", 0)
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉVÉNEMENT PIPELINE DEBUG - Transparence chaîne de traitement
        # ═══════════════════════════════════════════════════════════════════
        pipeline_info = []
        for cat, cat_sources in by_category.items():
            pipeline_info.append({
                "category": cat,
                "sources_count": len(cat_sources),
                "status": "✅" if len(cat_sources) > 0 else "❌"
            })
        
        yield sse("pipeline_debug", {
            "message": "📡 Détails du pipeline de recherche",
            "categories_queried": list(by_category.keys()),
            "results_per_category": {k: len(v) for k, v in by_category.items()},
            "api_timings": timings,
            "total_raw_sources": sum(len(v) for v in by_category.values()),
            "total_after_dedup": len(sources),
            "dedup_removed": sum(len(v) for v in by_category.values()) - len(sources),
            "pipeline_steps": [
                {"step": "1. Fetch parallèle", "status": "✅", "details": f"{len(by_category)} catégories interrogées"},
                {"step": "2. Parsing/Normalisation", "status": "✅", "details": f"{sum(len(v) for v in by_category.values())} résultats bruts"},
                {"step": "3. Déduplication", "status": "✅", "details": f"{len(sources)} résultats uniques"},
                {"step": "4. Clustering", "status": "pending", "details": "En cours..."}
            ]
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 3: CLUSTERING THÉMATIQUE
        # ═══════════════════════════════════════════════════════════════════
        yield sse("stage", {"message": "📊 Organisation par thème..."})
        
        clusters = cluster_by_theme(sources, query)
        
        yield sse("clusters", {
            "themes": list(clusters.keys()),
            "counts": {k: len(v) for k, v in clusters.items()}
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 4B: RAPPORTS THÉMATIQUES (Multi-Report)
        # ═══════════════════════════════════════════════════════════════════
        yield sse("stage", {"message": "📝 Génération des rapports thématiques..."})
        
        thematic_reports = []
        top_themes = list(clusters.keys())[:3]  # Top 3 thèmes
        
        async def generate_theme_report(theme_name: str, theme_sources: List[Dict]) -> Dict:
            """Génère un rapport focalisé sur un thème spécifique."""
            if not theme_sources:
                return {"theme": theme_name, "content": "Aucune source pour ce thème.", "sources_count": 0}
            
            # Construire le contexte du thème
            theme_context = "\n".join([
                f"[{i+1}] {s.get('title', '')}: {s.get('snippet', '')[:200]}"
                for i, s in enumerate(theme_sources[:10])
            ])
            
            theme_prompt = f"""THÈME: {theme_name}
            
Sources disponibles ({len(theme_sources)}):
{theme_context}

Rédige une analyse focalisée sur ce thème spécifique.
Structure:
## {theme_name}
- Points clés (3-5 bullets)
- Analyse détaillée (200 mots)
- Implications

Cite tes sources avec [X]. Sois précis et factuel."""
            
            try:
                result = await ai_router.route(
                    prompt=theme_prompt,
                    system_prompt="Tu es un analyste expert. Synthèse thématique.",
                    preferred_provider="groq",
                    max_tokens=600
                )
                return {
                    "theme": theme_name,
                    "content": result.get("response", ""),
                    "sources_count": len(theme_sources)
                }
            except Exception as e:
                logger.error(f"Theme report error for {theme_name}: {e}")
                return {"theme": theme_name, "content": f"Erreur: {e}", "sources_count": 0}
        
        # Génération parallèle des 3 rapports thématiques
        if top_themes:
            theme_tasks = [
                generate_theme_report(theme, clusters.get(theme, []))
                for theme in top_themes
            ]
            thematic_reports = await asyncio.gather(*theme_tasks)
            
            yield sse("thematic_reports", {"reports": thematic_reports})
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 5: SCORING TRANSPARENT
        # ═══════════════════════════════════════════════════════════════════
        yield sse("stage", {"message": "📈 Calcul de confiance..."})
        
        confidence = calculate_confidence_v7(sources, query)
        
        yield sse("confidence", confidence)
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 5: SYNTHÈSE VULGARISÉE (IA)
        # ═══════════════════════════════════════════════════════════════════
        yield sse("stage", {"message": "🤖 Rédaction d'une synthèse accessible..."})
        
        synthesis_text = ""
        try:
            synthesis_prompt = build_synthesis_prompt(query, sources)
            
            synthesis_result = await ai_router.route(
                prompt=synthesis_prompt,
                system_prompt="Tu es un chercheur expert. Redige un rapport detaille.",
                preferred_provider="openrouter",  # Utilise DeepSeek pour la longueur et la qualité
                max_tokens=4000
            )

            
            synthesis_text = synthesis_result.get("response", "")
            
            yield sse("synthesis", {"text": synthesis_text})
            
        except Exception as e:
            logger.error(f"Synthesis error: {e}")
            yield sse("synthesis", {"text": f"⚠️ Erreur lors de la synthèse: {e}", "error": True})
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 6: TABLEAU ACADÉMIQUE
        # ═══════════════════════════════════════════════════════════════════
        yield sse("stage", {"message": "📋 Génération du tableau académique..."})
        
        academic_table = generate_academic_table(sources)
        
        yield sse("academic_table", {"markdown": academic_table})
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 7: FAQ SOURCÉE
        # ═══════════════════════════════════════════════════════════════════
        yield sse("stage", {"message": "❓ Génération de la FAQ..."})
        
        try:
            faq_prompt = build_faq_prompt(query, sources)
            
            faq_result = await ai_router.route(
                prompt=faq_prompt,
                system_prompt="FAQ concise et sourcée.",
                preferred_provider="mistral",
                max_tokens=500
            )
            
            yield sse("faq", {"text": faq_result.get("response", "")})
            
        except Exception as e:
            logger.error(f"FAQ error: {e}")
            yield sse("faq", {"text": "", "error": True})
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 8: PREUVES PAR THÈME (avec snippets)
        # ═══════════════════════════════════════════════════════════════════
        evidence_markdown = generate_evidence_by_theme(clusters)
        
        yield sse("evidence_by_theme", {
            "markdown": evidence_markdown,
            "clusters": {
                theme: [
                    {
                        "id": s["id"],
                        "title": s["title"],
                        "snippet": s["snippet"],
                        "provider": s["provider"],
                        "source_type": s["source_type"],
                        "url": s["url"],
                        "raw_confidence": s.get("raw_confidence", 0)
                    }
                    for s in sources_list
                ]
                for theme, sources_list in clusters.items()
            }
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 9: RÉFÉRENCES COMPLÈTES
        # ═══════════════════════════════════════════════════════════════════
        yield sse("references", {
            "sources": [
                {
                    "id": s["id"],
                    "index": i + 1,
                    "title": s["title"],
                    "url": s["url"],
                    "provider": s["provider"],
                    "source_type": s["source_type"],
                    "timestamp": s.get("timestamp", ""),
                    "snippet": s["snippet"][:200],
                    "metadata": s.get("metadata", {})
                }
                for i, s in enumerate(sources)
            ],
            "total": len(sources)
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # ÉTAPE 10: FIN
        # ═══════════════════════════════════════════════════════════════════
        elapsed_total = round((time.time() - start_time) * 1000)
        
        # Logging pour CI/audit
        logger.info(f"[DEEP_SEARCH] request_id={request_id} user_lang={lang} "
                    f"providers_consulted={len(providers_consulted)} sources_count={len(sources)} "
                    f"confidence_score={confidence['score']} requires_human_review={confidence['requires_human_review']} "
                    f"elapsed_ms={elapsed_total}")
        
        yield sse("complete", {
            "request_id": request_id,
            "elapsed_ms": elapsed_total,
            "sources_count": len(sources),
            "providers_count": len(providers_consulted),
            "providers_target_met": len(providers_consulted) >= MIN_PROVIDERS_TARGET,
            "confidence_score": confidence["score"],
            "requires_human_review": confidence["requires_human_review"]
        })
        
    except Exception as e:
        logger.error(f"Deep search v9 error: {e}", exc_info=True)
        yield sse("error", {"message": str(e), "request_id": request_id})


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/deep")
async def deep_search_endpoint(
    q: str = Query(..., min_length=2, max_length=500, description="Requête de recherche"),
    lang: str = Query("auto", description="Langue (fr, en, auto)")
):
    """Endpoint Deep Search V9."""
    return StreamingResponse(
        deep_search_generator_v9(q, lang),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# Frontend endpoint - THIS IS WHAT THE FRONTEND CALLS
@router.get("/api/v6/deep-search")
async def deep_search_v6_endpoint(
    q: str = Query(..., min_length=2, max_length=500),
    lang: str = Query("auto")
):
    """Endpoint V6 compatible avec le frontend."""
    return await deep_search_endpoint(q, lang)


# Legacy endpoint for backward compatibility
@router.get("/search")
async def legacy_deep_search(
    q: str = Query(...),
    lang: str = Query("auto")
):
    """Legacy endpoint - redirects to v9."""
    return await deep_search_endpoint(q, lang)


# ══════════════════════════════════════════════════════════════════════════════
# MONITORING - TEST TOUTES LES APIs
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/api-status")
async def api_status_check(
    test_query: str = Query("diabetes", description="Query to test APIs with")
):
    """Teste toutes les APIs et retourne statut."""
    import httpx
    from services.api_registry import get_all_enabled_apis
    from urllib.parse import quote
    
    results = []
    
    apis = get_all_enabled_apis()
    
    for api_name, api_config in apis.items():
        api_result = {
            "name": api_name,
            "display_name": api_config.name,
            "category": api_config.category.value,
            "timeout": api_config.timeout,
            "status": "pending",
            "results_count": 0,
            "elapsed_ms": 0,
            "error": None
        }
        
        # Skip internal APIs
        if api_config.url_template.startswith("internal://"):
            api_result["status"] = "internal"
            api_result["error"] = "Internal API - not tested directly"
            results.append(api_result)
            continue
        
        # Skip APIs requiring keys
        if api_config.requires_key:
            import os
            key = os.getenv(api_config.key_env_var, "")
            if not key:
                api_result["status"] = "no_key"
                api_result["error"] = f"Missing {api_config.key_env_var}"
                results.append(api_result)
                continue
        
        start = time.time()
        try:
            url = api_config.url_template.format(query=quote(test_query), lang="en")
            
            async with httpx.AsyncClient(timeout=api_config.timeout) as client:
                resp = await client.get(url, follow_redirects=True)
                
                elapsed_ms = int((time.time() - start) * 1000)
                api_result["elapsed_ms"] = elapsed_ms
                
                if resp.status_code == 200:
                    api_result["status"] = "ok"
                    # Try to count results
                    try:
                        if "json" in resp.headers.get("content-type", ""):
                            data = resp.json()
                            # Try various result counting strategies
                            if isinstance(data, list):
                                api_result["results_count"] = len(data)
                            elif "results" in data:
                                api_result["results_count"] = len(data["results"])
                            elif "items" in data:
                                api_result["results_count"] = len(data["items"])
                            elif "data" in data:
                                api_result["results_count"] = len(data.get("data", []))
                    except:
                        pass
                else:
                    api_result["status"] = "http_error"
                    api_result["error"] = f"HTTP {resp.status_code}"
                    
        except asyncio.TimeoutError:
            api_result["status"] = "timeout"
            api_result["error"] = f"Timeout after {api_config.timeout}s"
            api_result["elapsed_ms"] = int((time.time() - start) * 1000)
        except httpx.ConnectError as e:
            api_result["status"] = "connection_error"
            api_result["error"] = str(e)[:100]
            api_result["elapsed_ms"] = int((time.time() - start) * 1000)
        except Exception as e:
            api_result["status"] = "error"
            api_result["error"] = f"{type(e).__name__}: {str(e)[:100]}"
            api_result["elapsed_ms"] = int((time.time() - start) * 1000)
        
        results.append(api_result)
    
    # Summary
    working = [r for r in results if r["status"] == "ok"]
    failed = [r for r in results if r["status"] not in ["ok", "internal", "no_key", "pending"]]
    
    return {
        "summary": {
            "total_apis": len(results),
            "working": len(working),
            "failed": len(failed),
            "internal": len([r for r in results if r["status"] == "internal"]),
            "no_key": len([r for r in results if r["status"] == "no_key"])
        },
        "working_apis": [r["name"] for r in working],
        "failed_apis": [{"name": r["name"], "error": r["error"]} for r in failed],
        "details": results
    }


# ══════════════════════════════════════════════════════════════════════════════
# EXPORT
# ══════════════════════════════════════════════════════════════════════════════

# Pour import depuis main.py
deep_search_generator = deep_search_generator_v9
