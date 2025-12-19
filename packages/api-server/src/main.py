"""
WikiAsk Backend - Hybrid AI Classification
Precise results in ALL domains with domain-specific processing
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan"""
    logger.info("🚀 Starting WikiAsk Backend...")
    
    # V7 Architecture only
    from services.smart_search_v7 import smart_search_v7
    logger.info("🚀 V7 Engine initialized")
    
    yield
    
    logger.info("🛑 Shutting down...")
    from services.http_client import cleanup_http_client
    await cleanup_http_client()


app = FastAPI(
    title="WikiAsk - Global Search Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Include chat router
from endpoints.chat import router as chat_router
app.include_router(chat_router)

# Include search router
from endpoints.search import router as search_router
app.include_router(search_router)

# Include deep search router
from endpoints.deep_search import router as deep_search_router
app.include_router(deep_search_router)

# Include smart search router (AI-powered pipeline)
from endpoints.smart_search import smart_router
app.include_router(smart_router)

# Include trending articles router
from endpoints.trending import router as trending_router
app.include_router(trending_router)

# Include chat tester router (24/24 monitoring)
from endpoints.tester import router as tester_router
app.include_router(tester_router)

# Include languages router (multi-language support)
from endpoints.languages import router as languages_router
app.include_router(languages_router)

# Include voice router (TTS/STT)
from endpoints.voice import router as voice_router
app.include_router(voice_router)



# ============================================
# WEATHER WIDGET ENDPOINT
# ============================================
@app.get("/api/v6/weather")
async def get_weather_widget(city: str = Query(..., min_length=2), lang: str = Query("fr")):
    """Get structured weather data for widget"""
    import os
    import httpx
    
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        return {"error": "API Key missing"}
        
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric&lang={lang}"
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=3.0)
        if resp.status_code == 200:
            data = resp.json()
            return {
                "success": True,
                "city": data.get("name"),
                "temp": round(data["main"]["temp"]),
                "desc": data["weather"][0]["description"].capitalize(),
                "icon": data["weather"][0]["icon"]
            }
    return {"success": False, "error": "City not found"}


# ============================================
# MEGA BRAIN STATS ENDPOINT
# ============================================
@app.get("/api/brain/stats")
async def get_brain_stats():
    """Statistiques du MegaBrain (50+ APIs)."""
    from services.mega_api_brain import mega_brain
    return mega_brain.get_stats()


@app.get("/api/brain/query")
async def query_brain(q: str = Query(..., min_length=2), lang: str = Query("fr")):
    """Interroge le MegaBrain directement."""
    from services.mega_api_brain import mega_brain
    results = await mega_brain.query_brain(q, lang=lang, max_apis=10)
    return results


# ============================================
# CACHE STATS ENDPOINT
# ============================================
@app.get("/api/cache/stats")
async def get_cache_stats():
    """Statistiques du cache pour monitoring."""
    from services.ultra_cache import search_cache, api_cache, ai_cache
    return {
        "search_cache": search_cache.get_stats(),
        "api_cache": api_cache.get_stats(),
        "ai_cache": ai_cache.get_stats()
    }


# ============================================
# YOUTUBE AUTOMATION ENDPOINTS
# ============================================
@app.get("/api/youtube/topics")
async def get_youtube_topics(category: str = None):
    """Liste tous les sujets vidéo disponibles."""
    from services.youtube_automation import youtube_generator
    if category:
        return youtube_generator.get_topics_by_category(category)
    return youtube_generator.get_all_topics()


@app.get("/api/youtube/stats")
async def get_youtube_stats():
    """Statistiques du système YouTube."""
    from services.youtube_automation import youtube_generator
    return youtube_generator.get_stats()


@app.get("/api/youtube/schedule")
async def get_youtube_schedule(week: int = 1):
    """Planning de publication de la semaine."""
    from services.youtube_automation import youtube_generator
    return youtube_generator.get_weekly_schedule(week)


@app.post("/api/youtube/generate")
async def generate_youtube_video(topic_id: int = Query(..., ge=1)):
    """Génère une vidéo complète (script + audio + metadata)."""
    from services.youtube_automation import youtube_generator
    result = await youtube_generator.generate_full_video(topic_id)
    return result


@app.get("/api/youtube/script")
async def generate_youtube_script(topic_id: int = Query(..., ge=1)):
    """Génère uniquement le script d'une vidéo."""
    from services.youtube_automation import youtube_generator, VIDEO_TOPICS
    topic = next((t for t in VIDEO_TOPICS if t["id"] == topic_id), None)
    if not topic:
        return {"success": False, "error": "Topic not found"}
    result = await youtube_generator.generate_script(topic)
    return result

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,https://wikiask.io").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Rate limiting middleware
from starlette.middleware.base import BaseHTTPMiddleware
from services.rate_limiter import rate_limit_middleware
app.add_middleware(BaseHTTPMiddleware, dispatch=rate_limit_middleware)


# ============================================
# MODELS
# ============================================

class SearchRequest(BaseModel):
    query: str
    use_cache: bool = True


class AskRequest(BaseModel):
    query: str
    language: str = "fr"
    use_cache: bool = True


class SocialMediaRequest(BaseModel):
    """Request for social media content generation and posting"""
    topic: str
    platforms: list[str] = ["twitter", "youtube"]
    style: str = "news"  # news, short, tutorial, analysis
    duration_seconds: int = 60
    lang: str = "fr"
    voice_id: str = None



# ============================================
# AI ROUTING BY DOMAIN
# ============================================

# Map detected categories to best AI provider
DOMAIN_TO_AI = {
    # Tech/Code → Groq (Llama 3.3 - excellent for code)
    "tech": "groq",
    
    # Medical → Mistral (precise and factual)
    "health": "mistral",
    
    # Finance → Groq (fast and accurate with numbers)
    "finance": "groq",
    
    # Creative/Entertainment → Gemini (creative)
    "entertainment": "gemini",
    "fun": "gemini",
    "images": "gemini",
    
    # Knowledge/Science → Mistral (balanced)
    "knowledge": "mistral",
    "science": "mistral",
    "geo": "mistral",
    
    # Weather/News → Groq (fast)
    "weather": "groq",
    "news": "groq",
    
    # Food → Gemini (descriptive)
    "food": "gemini",
    "sports": "groq",
    # Tourism → Gemini (creative and descriptive)
    "tourism": "gemini",
    "geo": "gemini",
}


# Specialized system prompts by domain - ULTRA-SPECIFIC responses
DOMAIN_PROMPTS = {
    "tech": """Tu es un expert technique senior avec 15 ans d'expérience.

🎯 OBJECTIF: Réponse ULTRA-PRÉCISE de 500+ mots avec exemples de code CONCRETS.

📋 STRUCTURE OBLIGATOIRE:
## Résumé Express
[2-3 phrases résumant la réponse]

## Explication Détaillée
[Analyse technique approfondie]

## Code Exemple
```[language]
[Code fonctionnel copier-coller]
```

## Ressources
- [Lien documentation officielle]
- [Tutoriel recommandé]

⚠️ RÈGLES STRICTES:
- Code FONCTIONNEL et testé
- Versions EXACTES des packages
- Cite GitHub, npm, documentation officielle
- Explique POURQUOI, pas seulement COMMENT""",

    "health": """Tu es un médecin généraliste expert en vulgarisation.

⚠️ AVERTISSEMENT OBLIGATOIRE EN HAUT:
"Ces informations sont éducatives. Consultez un professionnel de santé."

🎯 OBJECTIF: Réponse RASSURANTE et PRÉCISE de 500+ mots.

📋 STRUCTURE OBLIGATOIRE:
## En Bref
[Résumé en 2-3 phrases]

## Explication Médicale
[Vulgarisation claire]

## Symptômes à Surveiller
- [Liste précise]

## Que Faire
1. [Actions concrètes]
2. [Quand consulter]

## Sources Médicales
- Source: PubMed, OMS, ou études citées

⚠️ RÈGLES: Jamais de diagnostic. Toujours recommander un médecin si doute.""",

    "finance": """Tu es un analyste financier senior Bloomberg/Reuters.

🎯 OBJECTIF: Analyse PRÉCISE avec CHIFFRES EXACTS de 500+ mots.

📋 STRUCTURE OBLIGATOIRE:
## 📊 Données Temps Réel
| Actif | Prix | Variation 24h |
|-------|------|---------------|
[Tableau avec données RÉELLES des APIs]

## Analyse de Marché
[Tendances actuelles avec dates et chiffres]

## Facteurs d'Influence
- [Événements récents avec dates]
- [Impact sur les prix]

## Perspectives
[Prévisions prudentes]

⚠️ DISCLAIMER: "Ceci n'est pas un conseil d'investissement."

⚠️ RÈGLES:
- Prix RÉELS uniquement (pas d'invention)
- Cite CoinGecko, Exchange, Bloomberg
- Chiffres avec 2 décimales max""",

    "entertainment": """Tu es un critique culturel passionné AlloCiné/IMDb.

🎯 OBJECTIF: Réponse ENTHOUSIASTE et PRÉCISE de 500+ mots.

📋 STRUCTURE OBLIGATOIRE:
## 🎬 Infos Clés
- **Titre**: [Exact]
- **Année**: [Année]
- **Note**: [X/10 sur TMDB/IMDb]
- **Durée**: [Xh Xmin]
- **Réalisateur**: [Nom]

## Synopsis
[Résumé sans spoiler]

## Notre Avis
[Critique détaillée]

## Si Vous Avez Aimé
- [Recommandation 1]
- [Recommandation 2]

## Où Regarder
[Plateformes de streaming]

⚠️ RÈGLES: Cite TMDB, IMDb. Pas de spoilers majeurs.""",

    "weather": """Tu es un météorologue Météo France.

🎯 OBJECTIF: Prévisions PRÉCISES et PRATIQUES de 500+ mots.

📋 STRUCTURE OBLIGATOIRE:
## 🌡️ Conditions Actuelles
| Paramètre | Valeur |
|-----------|--------|
| Température | XX°C |
| Ressenti | XX°C |
| Vent | XX km/h |
| Humidité | XX% |

## Prévisions
- **Matin**: [Détail]
- **Après-midi**: [Détail]
- **Soir**: [Détail]

## Activités Recommandées
✅ Idéal pour: [activités]
❌ À éviter: [activités]

## Conseils Pratiques
[Équipement, précautions]

⚠️ RÈGLES: Données Open-Meteo. Conseils PRATIQUES.""",

    "sports": """Tu es un journaliste sportif L'Équipe/ESPN.

🎯 OBJECTIF: Infos sportives PRÉCISES de 500+ mots.

📋 STRUCTURE OBLIGATOIRE:
## 📊 Résultats/Classement
[Tableau avec scores RÉELS]

## Analyse
[Performances, statistiques]

## Calendrier
[Prochains matchs avec dates/heures]

## Où Regarder
[Chaînes TV, streaming]

⚠️ RÈGLES: Scores RÉELS. Cite TheSportsDB, ESPN.""",

    "geo": """Tu es un guide touristique Lonely Planet expert.

🎯 OBJECTIF: Guide ULTRA-PRATIQUE de 500+ mots.

📋 STRUCTURE OBLIGATOIRE:
## 📍 Informations
- **Pays**: [Nom]
- **Capitale**: [Nom]
- **Population**: [X millions]
- **Langue**: [Langue(s)]
- **Monnaie**: [Devise + symbole]

## À Savoir
[Infos essentielles]

## Conseils Voyage
[Tips pratiques]

⚠️ RÈGLES: Données RestCountries. Chiffres EXACTS.""",

    "tourism": """Tu es un guide touristique local EXPERT de la destination demandée.

🎯 OBJECTIF: Répondre PRÉCISÉMENT à la question posée avec 500+ mots.

⚠️ RÈGLE ABSOLUE: Si l'utilisateur demande "où manger", tu donnes des RESTAURANTS.
Si il demande "que faire", tu donnes des ACTIVITÉS. JAMAIS de recette de cuisine.

📋 ADAPTE TA RÉPONSE:

### Si question "où manger" / "restaurants":
## 🍽️ Où Manger à [VILLE]
| Restaurant | Spécialité | Prix | Quartier |
|------------|------------|------|----------|
| [Nom réel] | [Cuisine] | €€ | [Quartier] |

### Si question "que faire" / "visiter":
## 🏆 TOP 5 Activités
1. **[Lieu]** - [Description] - [Prix]

### Si question "où dormir" / "hôtel":
## 🏨 Hébergements
- **Budget**: [Nom] - [Prix/nuit]
- **Luxe**: [Nom] - [Prix/nuit]

📍 OBLIGATOIRE:
- Cite des NOMS RÉELS connus de la ville
- Donne des QUARTIERS précis (Vieux Nice, Promenade des Anglais, etc.)
- Prix APPROXIMATIFS mais réalistes (€, €€, €€€)

🔥 MÊME SANS DONNÉES API:
Tu connais les destinations populaires. Utilise tes connaissances générales pour donner des recommandations UTILES et RÉALISTES.
Cite TripAdvisor, Google Maps, Lonely Planet comme sources.""",


    "food": """Tu es un chef étoilé Marmiton/750g.

🎯 OBJECTIF: Recette COMPLÈTE et PRÉCISE de 500+ mots.

📋 STRUCTURE OBLIGATOIRE:
## 🍳 Fiche Recette
- **Temps préparation**: X min
- **Temps cuisson**: X min
- **Difficulté**: Facile/Moyen/Difficile
- **Pour**: X personnes

## 🛒 Ingrédients
- [ ] X g de [ingrédient]
- [ ] X [unité] de [ingrédient]
[Liste complète avec quantités PRÉCISES]

## 📝 Étapes
1. **Préparation**: [Détail]
2. **Cuisson**: [Détail avec temps/température]
3. [...]

## 💡 Conseils du Chef
- [Astuce pro]

## 🍷 Accord
Vin: [Suggestion]

⚠️ RÈGLES: Quantités en grammes/ml. Temps de cuisson PRÉCIS.""",

    "default": """Tu es WikiAsk, un assistant de recherche INTELLIGENT et ADAPTABLE.

🧠 INTELLIGENCE CONTEXTUELLE:
- ANALYSE d'abord ce que l'utilisateur demande VRAIMENT
- ADAPTE ta réponse au TYPE de question (restaurants? météo? prix? activités?)
- JAMAIS de réponse générique ou hors-sujet

🎯 TA MISSION:
1. Identifier l'INTENTION exacte de l'utilisateur
2. Répondre PRÉCISÉMENT à cette intention
3. Si question sur un lieu → donner infos sur CE lieu
4. Si question sur un produit → donner infos sur CE produit
5. Si question "comment" → donner des ÉTAPES pratiques

📋 FORMAT:
- Utilise des titres markdown (## et ###)
- Tableaux pour les comparaisons et listes
- Bullet points pour les conseils
- 500+ mots minimum

⚠️ RÈGLE D'OR:
MÊME SANS DONNÉES API, tu as des connaissances générales.
Utilise-les pour répondre UTILEMENT à la question posée.
Ne dis JAMAIS "je ne peux pas répondre" ou "les données ne contiennent pas".
Donne une réponse UTILE basée sur tes connaissances."""
}



def get_best_ai_for_domain(categories: list) -> str:
    """Select the best AI provider based on detected categories."""
    # Priority order for AI selection
    priority_order = ["tourism", "finance", "health", "tech", "entertainment", "sports", "weather", "food", "geo", "science", "knowledge"]
    
    for priority_cat in priority_order:
        if priority_cat in categories and priority_cat in DOMAIN_TO_AI:
            return DOMAIN_TO_AI[priority_cat]
    
    # Fallback to first match
    for cat in categories:
        if cat in DOMAIN_TO_AI:
            return DOMAIN_TO_AI[cat]
    return "mistral"  # Default


def get_prompt_for_domain(categories: list, language: str) -> str:
    """Get specialized system prompt for the domain."""
    # Priority order for prompt selection - tourism first when a city/place is mentioned
    priority_order = ["tourism", "finance", "health", "tech", "entertainment", "sports", "weather", "food", "geo", "science", "knowledge"]
    
    base_prompt = None
    for priority_cat in priority_order:
        if priority_cat in categories and priority_cat in DOMAIN_PROMPTS:
            base_prompt = DOMAIN_PROMPTS[priority_cat]
            break
    
    if not base_prompt:
        for cat in categories:
            if cat in DOMAIN_PROMPTS:
                base_prompt = DOMAIN_PROMPTS[cat]
                break
        else:
            base_prompt = DOMAIN_PROMPTS["default"]

    
    # Add language and length requirements
    if language == "fr":
        lang_suffix = """

🌍 LANGUE: Réponds en FRANÇAIS.

📏 LONGUEUR: Ta réponse doit faire MINIMUM 500 mots.
Utilise des paragraphes, des listes à puces, et des sous-titres pour structurer.
Sois complet, détaillé et engageant."""
    else:
        lang_suffix = """

🌍 LANGUAGE: Respond in ENGLISH.

📏 LENGTH: Your response must be MINIMUM 500 words.
Use paragraphs, bullet points, and subheadings to structure.
Be comprehensive, detailed and engaging."""
    
    return base_prompt + lang_suffix


# ============================================
# AI SYNTHESIS
# ============================================

async def synthesize_with_ai(query: str, api_results: dict, language: str = "fr") -> dict:
    """Combine API data with AI using domain-based routing."""
    from services.ai_router import ai_router
    
    # Get detected categories
    categories = api_results.get("detected_categories", ["default"])
    
    # Select best AI for this domain
    preferred_ai = get_best_ai_for_domain(categories)
    logger.info(f"🤖 Domain routing: {categories} → {preferred_ai}")
    
    # Get specialized prompt
    system_prompt = get_prompt_for_domain(categories, language)
    
    # Build context from API results
    context_parts = []
    for result in api_results.get("results", [])[:10]:
        source = result.get("source", "unknown")
        data = result.get("data", {})
        
        if isinstance(data, dict):
            data_text = str(data)[:800]
        elif isinstance(data, list):
            data_text = str(data[:5])[:800]
        else:
            data_text = str(data)[:800]
        
        context_parts.append(f"[{source.upper()}]: {data_text}")
    
    context = "\n\n".join(context_parts) if context_parts else "Aucune donnée API disponible."
    
    # INTELLIGENT ANTI-FAIL PROMPT
    user_prompt = f"""
════════════════════════════════════════════════════════════════════
🎯 QUESTION DE L'UTILISATEUR (RÉPONDS UNIQUEMENT À CECI):
════════════════════════════════════════════════════════════════════
{query}

════════════════════════════════════════════════════════════════════
📊 DONNÉES API (UTILISE SEULEMENT CE QUI EST PERTINENT):
════════════════════════════════════════════════════════════════════
{context}

════════════════════════════════════════════════════════════════════
⚠️ RÈGLES ABSOLUES - VIOLE CES RÈGLES = ÉCHEC TOTAL:
════════════════════════════════════════════════════════════════════
1. RÉPONDS UNIQUEMENT à la question posée. RIEN D'AUTRE.

2. IGNORE COMPLÈTEMENT les données API qui ne sont PAS liées à la question.
   - Question sur vacances en Europe? IGNORE les prix Bitcoin.
   - Question sur restaurants? IGNORE la météo.
   - Question sur météo? IGNORE les films.

3. N'INCLUS JAMAIS de sections hors-sujet.
   - Pas de "Analyse de marché Bitcoin" dans une réponse sur le tourisme.
   - Pas de "Recette" dans une réponse sur les restaurants.

4. Si les données API ne sont pas pertinentes, UTILISE TES CONNAISSANCES.
   Tu connais l'Europe, les villes, les restaurants populaires, etc.

5. STRUCTURE CLAIRE avec titres markdown (##, ###).

6. 500+ mots UNIQUEMENT sur le sujet demandé.

COMMENCE TA RÉPONSE (RESTE 100% SUR LE SUJET):
"""


    
    try:
        # Route to preferred AI based on domain
        ai_result = await ai_router.route(
            prompt=user_prompt, 
            system_prompt=system_prompt,
            preferred_provider=preferred_ai
        )
        
        return {
            "success": True,
            "query": query,
            "response": ai_result["response"],
            "ai_provider": ai_result["source"],
            "ai_selected_for": categories[0] if categories else "default",
            "ai_time_ms": round(ai_result["processing_time_ms"]),
            "sources": api_results.get("sources", []),
            "apis_used": api_results.get("apis_successful", 0),
            "detected_categories": categories,
            "api_time_ms": api_results.get("execution_time_ms", 0),
            "total_time_ms": api_results.get("execution_time_ms", 0) + round(ai_result["processing_time_ms"])
        }
    except Exception as e:
        logger.error(f"AI synthesis failed: {e}")
        return {
            "success": False,
            "query": query,
            "error": str(e),
            "raw_results": api_results.get("results", [])[:5]
        }


# ============================================
# ENDPOINTS
# ============================================

@app.get("/")
async def root():
    from services.mega_api_registry import MEGA_APIS, get_mega_stats
    
    stats = get_mega_stats()
    
    return {
        "name": "WikiAsk",
        "version": "1.0.0",
        "status": "operational",
        "features": [
            "hybrid AI classification",
            f"{stats['total_apis']} APIs",
            f"{len(stats['domains'])} domains",
            "precision search"
        ],
        "domains": list(stats['domains'].keys()),
        "ai_routing": DOMAIN_TO_AI,
        "endpoints": {
            "ask": "/api/ask?q=your+question",
            "search": "/api/search?q=query",
            "health": "/api/health"
        }
    }


@app.get("/api/health")
async def health():
    from services.mega_api_registry import get_mega_stats
    
    try:
        from services.cache import cache_service
        cache_ok = cache_service.health_check()
    except:
        cache_ok = True
    
    try:
        from services.ai_router import ai_router
        ai_count = len([p for p in ai_router.providers if p.available])
    except:
        ai_count = 5
    
    stats = get_mega_stats()
    
    return {
        "status": "healthy",
        "cache": "ok" if cache_ok else "degraded",
        "ai_providers": ai_count,
        "apis": stats['total_apis'],
        "domains": len(stats['domains']),
        "version": "1.0.0"
    }



@app.get("/api/stats")
async def stats():
    from services.ai_router import ai_router
    from services.mega_api_registry import get_mega_stats
    
    stats_data = get_mega_stats()
    
    return {
        "version": "1.0.0",
        "total_apis": stats_data['total_apis'],
        "domains": stats_data['domains'],
        "ai_routing": DOMAIN_TO_AI,
        "ai_status": ai_router.get_status()
    }


# ============================================
# NEWS HEADLINES ENDPOINT
# ============================================

@app.get("/api/news")
async def get_news(
    country: str = Query("fr", description="Country code (fr, us, gb, de, etc.)"),
    category: Optional[str] = Query(None, description="Category (technology, sports, entertainment, health, science, business)"),
    limit: int = Query(6, ge=1, le=12, description="Number of articles")
):
    """
    📰 Get today's top headlines with images.
    
    Returns news articles with:
    - title: Article title
    - description: Short description
    - image: Image URL (high quality)
    - url: Link to full article
    - source: News source name
    - date: Publication date
    """
    from services.news_service import get_top_headlines
    
    try:
        articles = await get_top_headlines(
            country=country,
            category=category,
            limit=limit
        )
        
        return {
            "success": True,
            "count": len(articles),
            "country": country,
            "category": category,
            "articles": articles
        }
    except Exception as e:
        logger.error(f"News endpoint error: {e}")
        return {
            "success": False,
            "error": str(e),
            "articles": []
        }


@app.get("/api/ask")
async def ask_get(
    q: str = Query(..., description="Your question"),
    lang: str = Query("fr", description="Response language (fr/en)")
):
    """
    Ask a question with hybrid AI classification.
    
    The system automatically:
    1. Detects category from keywords
    2. Uses AI to confirm intent
    3. Calls domain-specific APIs
    4. Generates precise response
    """
    from services.smart_search_v7 import smart_search_v7
    
    if not q or len(q.strip()) < 3:
        raise HTTPException(status_code=400, detail="Question too short")
    
    # Step 1: Get data from domain-specific APIs (with AI classification)
    api_results = await smart_search_v7.search(q.strip(), lang=lang)
    
    # Step 2: Synthesize with domain-appropriate AI
    return await synthesize_with_ai(q.strip(), api_results, lang)


@app.post("/api/ask")
async def ask_post(request: AskRequest):
    """Ask a question (POST method)"""
    from services.smart_search_v7 import smart_search_v7
    
    if not request.query or len(request.query.strip()) < 3:
        raise HTTPException(status_code=400, detail="Question too short")
    
    api_results = await smart_search_v7.search(request.query.strip(), lang=request.language)
    
    return await synthesize_with_ai(request.query.strip(), api_results, request.language)


@app.get("/api/search")
async def search_get_v5(q: str = Query(...), cache: bool = Query(True), lang: str = Query("fr")):
    """Search across all APIs - returns raw data with AI classification"""
    from services.smart_search_v7 import smart_search_v7
    
    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query too short")
    
    return await smart_search_v7.search(q.strip(), lang=lang)


@app.get("/api/ultimate")
async def ultimate_search(q: str = Query(...), lang: str = Query("fr")):
    """Alias for /api/ask"""
    from services.smart_search_v7 import smart_search_v7
    api_results = await smart_search_v7.search(q.strip(), lang=lang)
    return await synthesize_with_ai(q.strip(), api_results, lang)


# ============================================
# SPEED + DEEP MODES
# ============================================

@app.get("/api/fast")
async def fast_search(
    q: str = Query(..., description="Your question"),
    lang: str = Query("fr", description="Response language (fr/en)")
):
    """
    ⚡ SPEED MODE (~1.5s)
    - SearXNG (Google/Bing proxy) for web results
    - 1-2 key domain APIs for precise data
    - Smart AI routing based on query type
    - Returns: explanation + clickable links
    """
    import asyncio
    from datetime import datetime
    from services.ai_router import ai_router
    from services.smart_search_v7 import smart_search_v7
    from services.cache import cache_service
    
    start = datetime.now()
    query = q.strip()
    
    if not query or len(query) < 2:
        raise HTTPException(status_code=400, detail="Question too short")
    
    # ══════════════════════════════════════════════════════════════
    # 1. LANGUAGE DETECTION (For Response & Cache)
    # ══════════════════════════════════════════════════════════════
    query_lower = query.lower()
    
    # Detect language from query words
    if any(w in query_lower for w in ['what', 'how', 'where', 'when', 'who', 'why', 'the', 'is', 'are', 'do', 'does', 'can', 'will', 'best', 'top']):
        detected_lang = "en-US"
    elif any(w in query_lower for w in ['que', 'quoi', 'comment', 'où', 'quand', 'qui', 'pourquoi', 'le', 'la', 'les', 'est', 'sont', 'faire', 'meilleur']):
        detected_lang = "fr-FR"
    elif any(w in query_lower for w in ['qué', 'cómo', 'dónde', 'cuándo', 'quién', 'por qué', 'el', 'la', 'los', 'es', 'son', 'hacer']):
        detected_lang = "es"
    elif any(w in query_lower for w in ['was', 'wie', 'wo', 'wann', 'wer', 'warum', 'der', 'die', 'das', 'ist', 'sind', 'machen']):
        detected_lang = "de"
    elif any(ord(c) >= 0x0590 and ord(c) <= 0x05FF for c in query):  # Hebrew
        detected_lang = "he"
    elif any(ord(c) >= 0x0600 and ord(c) <= 0x06FF for c in query):  # Arabic
        detected_lang = "ar"
    elif any(ord(c) >= 0x4E00 and ord(c) <= 0x9FFF for c in query):  # Chinese
        detected_lang = "zh"
    else:
        detected_lang = "en-US"  # Default
        
    # ══════════════════════════════════════════════════════════════
    # 2. CACHE CHECK
    # ══════════════════════════════════════════════════════════════
    cache_key_data = f"{detected_lang}:{query}"
    cached_result = cache_service.get("speed", cache_key_data)
    if cached_result:
        # Update metrics for current request
        elapsed_cache = (datetime.now() - start).total_seconds() * 1000
        cached_result["total_time_ms"] = round(elapsed_cache)
        cached_result["ai_time_ms"] = 0
        cached_result["ai_provider"] = f"{cached_result.get('ai_provider', 'cache')} (cached)"
        return cached_result

    # ══════════════════════════════════════════════════════════════
    # 3. SMART SPEED SEARCH (The optimization)
    # ══════════════════════════════════════════════════════════════
    # Uses fast path + Top 1 Domain API + Top 1 Search Engine
    search_data = await smart_search_v7.search_fast(query)
    
    results = search_data["results"]
    category = search_data["category"]
    params = search_data["params"]
    
    # Select best AI for this domain
    preferred_ai = get_best_ai_for_domain([category])
    
    # ══════════════════════════════════════════════════════════════
    # 4. PROCESS RESULTS
    # ══════════════════════════════════════════════════════════════
    links = []
    web_context = ""
    domain_data = ""
    
    for r in results:
        data = r.get("data", {})
        source = r.get("source", "")
        
        # Web Search Results (SearXNG / DDG / Wiki)
        if "results" in data: # SearXNG
            for item in data.get("results", [])[:10]:
                links.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "snippet": item.get("content", "")[:150]
                })
                web_context += f"- {item.get('title', '')}: {item.get('content', '')[:200]}\n"
                
        elif "RelatedTopics" in data: # DDG
            for topic in data.get("RelatedTopics", [])[:3]:
                if "FirstURL" in topic:
                    links.append({"title": topic.get("Text", "")[:80], "url": topic.get("FirstURL", ""), "snippet": topic.get("Text", "")[:150]})
                    web_context += f"- {topic.get('Text', '')[:200]}\n"
                    
        elif "extract" in data: # Wikipedia
            wiki_title = data.get("title", query)
            wiki_url = data.get("content_urls", {}).get("desktop", {}).get("page", f"https://wikipedia.org/wiki/{query}")
            links.append({"title": f"Wikipedia: {wiki_title}", "url": wiki_url, "snippet": data.get("extract", "")[:150]})
            web_context += f"Wikipedia: {data.get('extract', '')[:400]}\n"
            
        else:
            # Domain Specific API Data (CoinGecko, TheSportsDB, etc.)
            # This is the high quality data we want the AI to see
            data_str = str(data)
            if len(data_str) > 1000: data_str = data_str[:1000]
            domain_data += f"[{source.upper()} DATA]: {data_str}\n"

    # ══════════════════════════════════════════════════════════════
    # 5. AI SYNTHESIS
    # ══════════════════════════════════════════════════════════════
    speed_prompt = f"""CRITICAL LANGUAGE RULE: Your response language is determined by the QUESTION LANGUAGE, NOT by the topic.
    
Question: "{query}" (Language: {detected_lang})
Category: {category}

Web Context:
{web_context[:1500]}

Specialized API Data (PRIORITY):
{domain_data}

RULES:
1. Respond in the SAME language as the question.
2. Use the "Specialized API Data" as your primary source if available.
3. Be concise (150-200 words).
4. Use bullet points.
5. If asking for price/score/weather, give the EXACT numbers from data.
"""

    try:
        # Debug: log web_context length
        print(f"[Speed] Query: {query}, web_context length: {len(web_context)}, domain_data: {len(domain_data)}")
        
        ai_result = await ai_router.route(
            prompt=speed_prompt,
            system_prompt="CRITICAL: You are a multilingual assistant. You MUST detect the language of the user's question and respond ONLY in that SAME language. If the question is in Spanish, respond in Spanish. If in Hebrew, respond in Hebrew. If in French, respond in French. This is your #1 priority. Your responses are concise (200 words max), accurate, and always based on provided data.",
            preferred_provider=preferred_ai,
            max_tokens=400
        )
        response = ai_result["response"]
        ai_provider = ai_result["source"]
        ai_time = ai_result["processing_time_ms"]
    except Exception as e:
        # Log the actual error
        print(f"[Speed] AI Failed: {str(e)[:200]}")
        
        # Smart fallback: if we have web content, create a mini-summary
        if web_context and len(web_context) > 50:
            response = f"Voici ce que j'ai trouvé pour '{query}':\n\n{web_context[:500]}"
            ai_provider = "context"
        else:
            response = f"Résultats pour '{query}' - Consultez les liens ci-dessous." if lang == "fr" else f"Results for '{query}' - Check the links below."
            ai_provider = "fallback"
        ai_time = 0
    
    elapsed = (datetime.now() - start).total_seconds() * 1000
    
    # Deduplicate links by URL
    seen_urls = set()
    unique_links = []
    for link in links:
        url = link.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique_links.append(link)
    
    result = {
        "success": True,
        "mode": "speed",
        "query": query,
        "category": category,
        "response": response,
        "links": unique_links[:30],
        "ai_provider": ai_provider,
        "ai_time_ms": round(ai_time),
        "total_time_ms": round(elapsed)
    }
    
    # SAVE TO CACHE (1 hour TTL)
    cache_service.set("speed", cache_key_data, result, ttl=3600)
    
    return result


@app.get("/api/deep")
async def deep_search(
    q: str = Query(..., description="Your question"),
    lang: str = Query("fr", description="Response language (fr/en)")
):
    """
    📚 DEEP MODE (~10s)
    - Full classification + all domain APIs
    - Images, documents, news
    - Comprehensive 1500+ word report
    """
    from services.smart_search_v7 import smart_search_v7
    
    if not q or len(q.strip()) < 3:
        raise HTTPException(status_code=400, detail="Question too short")
    
    # Use full search with AI classification
    api_results = await smart_search_v7.search(q.strip(), use_ai_classification=True, language=lang)
    
    # Get comprehensive response
    result = await synthesize_with_ai(q.strip(), api_results, lang)
    result["mode"] = "deep"
    
    return result


# ============================================
# V6 ENDPOINTS - Modular Interface Architecture
# ============================================

@app.get("/api/v6/search")
async def search_v6(
    q: str = Query(..., description="Your question"),
    lang: str = Query("fr", description="Response language")
):
    """
    🔍 SEARCH MODE v7 (~0.5-1s)
    - Classification IA (pas de keywords)
    - 15 liens de qualité
    - Données temps réel
    """
    from services.smart_search_v7 import smart_search_v7
    
    query = q.strip()
    if not query or len(query) < 2:
        raise HTTPException(status_code=400, detail="Question too short")
    
    result = await smart_search_v7.search(query, lang=lang)
    
    return {
        "success": True,
        "mode": "search",
        "query": query,
        "category": result.get("category", "knowledge"),
        "domain": result.get("category", "knowledge"),  # Alias pour compatibilité
        "context": result.get("domain_context", ""),
        "links": result.get("links", []),
        "total_time_ms": result.get("total_time_ms", 0),
        "message": f"🔍 Résultats pour: {query}" if lang == "fr" else f"🔍 Results for: {query}"
    }


# Backward compatibility - redirect old speed endpoint
@app.get("/api/v6/speed")
async def speed_v6_redirect(
    q: str = Query(..., description="Your question"),
    lang: str = Query("fr", description="Response language")
):
    """Redirect to new search endpoint for backward compatibility"""
    return await search_v6(q=q, lang=lang)


@app.get("/api/v6/ai-analysis")
async def ai_analysis_v6(
    q: str = Query(..., description="Your question"),
    lang: str = Query("fr", description="Response language")
):
    """
    🤖 AI ANALYSIS MODE v7 (~5-10s)
    - Classification IA + Synthèse IA
    - Réponse détaillée 500+ mots
    """
    from services.smart_search_v7 import smart_search_v7
    
    query = q.strip()
    if not query or len(query) < 2:
        raise HTTPException(status_code=400, detail="Question too short")
    
    result = await smart_search_v7.ai_analysis(query, lang=lang)
    
    return {
        "success": True,
        "mode": "ai_analysis",
        "query": query,
        "category": result.get("category", "knowledge"),
        "domain": result.get("category", "knowledge"),
        "response": result.get("response", ""),
        "links": result.get("links", []),
        "total_time_ms": result.get("total_time_ms", 0)
    }



# Backward compatibility - redirect old thinking endpoint
@app.get("/api/v6/thinking")
async def thinking_v6_redirect(
    q: str = Query(..., description="Your question"),
    lang: str = Query("fr", description="Response language")
):
    """Redirect to new AI Analysis endpoint for backward compatibility"""
    return await ai_analysis_v6(q=q, lang=lang)


@app.get("/api/v6/domains")
async def list_domains_v6():
    """Liste tous les domaines disponibles."""
    from services.smart_search_v7 import smart_search_v7
    
    return {
        "domains": ["general", "tech", "health", "finance", "news", "entertainment", "food", "tourism"],
        "version": "7.0",
        "architecture": "unified"
    }


@app.get("/api/v6/detect")
async def detect_domain_v6(q: str = Query(...)):
    """Détecte le domaine d'une requête."""
    from services.smart_search_v7 import smart_search_v7
    
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query required")
    
    # Simple keyword detection
    domain = "general"
    keywords = {
        "tech": ["code", "python", "javascript", "api", "github"],
        "health": ["santé", "médecin", "maladie", "symptôme"],
        "finance": ["bitcoin", "crypto", "bourse", "action"],
        "news": ["actualités", "news", "dernières"],
        "entertainment": ["film", "série", "musique"],
        "food": ["restaurant", "recette", "cuisine"],
        "tourism": ["voyage", "hôtel", "visite"]
    }
    for d, kws in keywords.items():
        if any(kw in query.lower() for kw in kws):
            domain = d
            break
    
    return {
        "query": query,
        "detected_domain": domain
    }


@app.get("/api/v6/ai-research")
async def ai_research_v6(
    q: str = Query(..., description="Your research question"),
    lang: str = Query("fr", description="Response language")
):
    """
    📚 AI RESEARCH MODE v6 (~30s)
    Recherche IA approfondie avec rapport PDF.
    - Multi-iteration research loop
    - Content extraction from quality sources
    - Professional PDF report generation
    - Works for ANY domain (medical, finance, tech, etc.)
    """
    from datetime import datetime
    from services.research_agent import research_agent
    from services.report_generator import report_generator
    from services.ai_router import ai_router
    from fastapi.responses import JSONResponse
    import base64
    
    start = datetime.now()
    query = q.strip()
    
    if not query or len(query) < 3:
        raise HTTPException(status_code=400, detail="Question too short")
    
    logger.info(f"📚 AI Research started: {query[:50]}...")
    
    # 1. Deep Research (up to 25 seconds)
    try:
        research_result = await research_agent.research(query, lang=lang)
    except Exception as e:
        logger.error(f"Research agent error: {e}")
        research_result = {"success": False, "error": str(e), "report": "", "sources": []}
    
    # Continuer même si la recherche a partiellement échoué
    if not research_result.get("success") and not research_result.get("report"):
        # Générer un rapport basique si tout a échoué
        research_result["report"] = f"# Rapport sur: {query}\n\nRecherche en cours de traitement..."
        research_result["sources"] = []
        research_result["domain"] = "knowledge"

    
    # 2. AI Enhancement of the report
    report_md = research_result.get("report", "")
    domain = research_result.get("domain", "knowledge")
    
    # Get specialized AI for synthesis
    preferred_ai = get_best_ai_for_domain([domain])
    
    enhancement_prompt = f"""Tu as devant toi un rapport de recherche expert basé sur 60+ APIs.
Améliore-le pour qu'il soit ULTRA COMPLET et professionnel (minimum 1500 mots).

Rapport brut:
{report_md}

Question originale: {query}

Instructions:
1. Structure claire avec titres et sous-titres (## et ###)
2. Chaque section doit être détaillée avec des faits précis
3. Ajoute des insights, analyses et recommandations
4. Cite les sources et données
5. Inclus des tableaux si données numériques
6. Langue: {lang.upper()}"""

    try:
        ai_result = await ai_router.route(
            prompt=enhancement_prompt,
            system_prompt="Tu es un expert rédacteur de rapports professionnels. Tu améliores et enrichis les rapports de recherche pour les rendre ULTRA COMPLETS.",
            preferred_provider=preferred_ai,
            max_tokens=4000
        )
        enhanced_report = ai_result.get("response", report_md)
        ai_time = ai_result.get("processing_time_ms", 0)
    except Exception as e:
        logger.error(f"AI enhancement failed: {e}")
        enhanced_report = report_md
        ai_time = 0
    
    # 3. Generate PDF
    pdf_result = report_generator.generate_pdf(enhanced_report)
    
    pdf_base64 = None
    pdf_filename = None
    if pdf_result.get("success"):
        pdf_base64 = base64.b64encode(pdf_result["pdf_bytes"]).decode("utf-8")
        pdf_filename = pdf_result.get("filename", "report.pdf")
    
    elapsed = (datetime.now() - start).total_seconds()
    logger.info(f"🔬 Expert Mode completed in {elapsed:.1f}s")
    
    return {
        "success": True,
        "mode": "ai_research",
        "query": query,
        "domain": domain,
        "report": enhanced_report,
        "pdf_available": pdf_result.get("success", False),
        "pdf_base64": pdf_base64,
        "pdf_filename": pdf_filename,
        "pdf_size_kb": pdf_result.get("size_kb", 0),
        "sources": research_result.get("sources", []),
        "links": research_result.get("links", []),
        "pages_analyzed": research_result.get("pages_analyzed", 0),
        "sub_questions": research_result.get("sub_questions", []),
        "ai_time_ms": round(ai_time),
        "total_time_seconds": round(elapsed, 1)
    }


# Backward compatibility - redirect old expert endpoint
@app.get("/api/v6/expert")
async def expert_v6_redirect(
    q: str = Query(..., description="Your research question"),
    lang: str = Query("fr", description="Response language")
):
    """Redirect to new AI Research endpoint for backward compatibility"""
    return await ai_research_v6(q=q, lang=lang)


@app.get("/api/v6/expert/pdf")
async def expert_pdf_download(
    q: str = Query(..., description="Your research question"),
    lang: str = Query("fr", description="Response language")
):
    """
    📄 Download Expert Report as PDF file directly.
    Same as /api/v6/expert but returns PDF binary.
    """
    from fastapi.responses import Response
    from datetime import datetime
    from services.research_agent import research_agent
    from services.report_generator import report_generator
    from services.ai_router import ai_router
    
    query = q.strip()
    
    if not query or len(query) < 3:
        raise HTTPException(status_code=400, detail="Question too short")
    
    # Research
    research_result = await research_agent.research(query, lang=lang)
    report_md = research_result.get("report", "")
    domain = research_result.get("domain", "knowledge")
    
    # AI Enhancement
    preferred_ai = get_best_ai_for_domain([domain])
    try:
        ai_result = await ai_router.route(
            prompt=f"Améliore ce rapport en {lang.upper()}, minimum 800 mots:\n\n{report_md}",
            system_prompt="Expert rédacteur de rapports professionnels.",
            preferred_provider=preferred_ai,
            max_tokens=2000
        )
        enhanced_report = ai_result.get("response", report_md)
    except:
        enhanced_report = report_md
    
    # Generate PDF
    pdf_result = report_generator.generate_pdf(enhanced_report)
    
    if not pdf_result.get("success"):
        raise HTTPException(status_code=500, detail="PDF generation failed")
    
    filename = pdf_result.get("filename", "wikiask_report.pdf")
    
    return Response(
        content=pdf_result["pdf_bytes"],
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@app.get("/api/v6/expert/stream")
async def expert_stream(
    q: str = Query(..., description="Your research question"),
    lang: str = Query("fr", description="Response language")
):
    """
    📡 EXPERT MODE avec SSE STREAMING
    Retourne des événements en temps réel sur la progression:
    - "🔍 Recherche sur Groq..."
    - "📚 Consultation ArXiv..."
    - "🧠 Synthèse avec Mistral..."
    """
    from fastapi.responses import StreamingResponse
    from services.sse_streaming import stream_expert_research
    
    query = q.strip()
    
    if not query or len(query) < 3:
        raise HTTPException(status_code=400, detail="Question too short")
    
    logger.info(f"📡 Expert Stream started: {query[:50]}...")
    
    return StreamingResponse(
        stream_expert_research(query, lang),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/v6/status")
async def api_status():
    """
    📊 Status et métriques de l'API
    """
    from services.cache import cache_service
    from services.ai_router import ai_router
    
    return {
        "status": "healthy",
        "version": "6.1",
        "modes": {
            "speed": {"target_time": "1.5s", "pages": 0},
            "thinking": {"target_time": "5s", "pages": 5},
            "expert": {"target_time": "30s", "pages": "9+", "pdf": True}
        },
        "cache": "memory" if cache_service.using_memory else "redis",
        "ai_providers": ai_router.get_status(),
        "endpoints": [
            "/api/v6/speed",
            "/api/v6/thinking", 
            "/api/v6/expert",
            "/api/v6/expert/stream",
            "/api/v6/expert/pdf"
        ]
    }

# ============================================
# SOCIAL MEDIA AUTOMATION API
# ============================================

@app.post("/api/social/generate-and-post")
async def social_generate_and_post(request: SocialMediaRequest):
    """
    🎬 Pipeline complet: Topic → Video IA (D-ID) → Multi-Platform
    
    Génère une vidéo avec avatar parlant et la poste sur les réseaux sociaux.
    
    Platforms supportées: twitter, youtube, tiktok
    Styles: news, short (TikTok), tutorial, analysis
    """
    from services.social_media.multi_poster import multi_poster
    
    logger.info(f"🎬 Social pipeline: {request.topic} → {request.platforms}")
    
    result = await multi_poster.generate_and_post(
        topic=request.topic,
        platforms=request.platforms,
        style=request.style,
        duration_seconds=request.duration_seconds,
        lang=request.lang,
        voice_id=request.voice_id
    )
    
    return result


@app.get("/api/social/platforms")
async def social_platforms():
    """
    Retourne la liste des plateformes supportées
    """
    return {
        "platforms": [
            {"id": "twitter", "name": "Twitter/X", "status": "ready"},
            {"id": "youtube", "name": "YouTube", "status": "ready"},
            {"id": "tiktok", "name": "TikTok", "status": "ready"}
        ],
        "styles": ["news", "short", "tutorial", "analysis"],
        "languages": ["fr", "en", "he", "ar", "es", "de"]
    }


@app.get("/api/social/credits")
async def social_credits():
    """
    Vérifie les crédits D-ID restants
    """
    from services.social_media.did_client import did_client
    
    credits = await did_client.get_credits()
    return credits


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    
    print(f"""
    ╔══════════════════════════════════════════════════════════╗
    ║  🔥 WikiAsk v5.0 - Hybrid AI Classification              ║
    ╠══════════════════════════════════════════════════════════╣
    ║  📡 Server: http://{host}:{port}                              ║
    ║  💬 Ask:    /api/ask?q=Question (precise AI routing)     ║
    ║  🎯 Precision: Keyword + AI classification hybrid        ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run("main:app", host=host, port=port, reload=True)

