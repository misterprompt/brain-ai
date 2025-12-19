"""
🚀 SMART SEARCH v7.0 - AI-FIRST + SPEED
========================================
- IA classifie TOUJOURS (pas de keywords)
- Parallélisation maximale
- Contexte formaté en texte lisible
- Simple, rapide, intelligent
"""

import asyncio
import httpx
import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from urllib.parse import quote

# Content Filter
from services.content_filter import filter_search_results, is_domain_blocked

# Mega API Brain (50+ APIs)
from services.mega_api_brain import mega_brain

# Ultra Cache
from services.ultra_cache import search_cache, api_cache, ai_cache

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SEARXNG_URL = os.getenv("SEARXNG_URL", "https://wikiask-searxng.fly.dev")

# APIs par catégorie (simples et directes)
DOMAIN_APIS = {
    "finance": {
        "url": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=eur,usd",
        "format": lambda d: f"💰 Bitcoin: {d.get('bitcoin',{}).get('eur','?')}€ | Ethereum: {d.get('ethereum',{}).get('eur','?')}€"
    },
    "weather": {
        "url": "https://api.openweathermap.org/data/2.5/weather?q={city}&appid=" + os.getenv('OPENWEATHER_API_KEY','') + "&units=metric&lang={lang}",
        "format": lambda d: f"🌡️ {d.get('name','?')}: {d.get('main',{}).get('temp','?')}°C, {d.get('weather',[{}])[0].get('description','?')}"
    },
    "food": {
        "url": "https://www.themealdb.com/api/json/v1/1/search.php?s={query}",
        "format": lambda d: "\n".join([f"🍽️ {m.get('strMeal','?')} ({m.get('strCategory','?')})" for m in (d.get('meals') or [])[:3]])
    },
    "entertainment": {
        "url": "https://api.themoviedb.org/3/search/multi?api_key=" + os.getenv('TMDB_API_KEY','') + "&query={query}&language={lang}",
        "format": lambda d: "\n".join([f"🎬 {r.get('title') or r.get('name','?')}" for r in d.get('results',[])[:3]])
    },
    "news": {
        "url": "https://newsapi.org/v2/everything?q={query}&apiKey=" + os.getenv('NEWSAPI_ORG_KEY','') + "&pageSize=5&language={lang_short}",
        "format": lambda d: "\n".join([f"📰 {a.get('title','?')}" for a in d.get('articles',[])[:3]])
    }
}

# Prompt classification IA (avec exemples pour meilleure précision)
CLASSIFY_PROMPT = """Tu es un classificateur. Analyse l'intention de cette requête et réponds avec UN SEUL MOT parmi:

CATÉGORIES:
- finance: crypto, bitcoin, ethereum, prix actions, bourse, investissement
- weather: météo, température, pluie, neige, climat
- food: recettes, cuisine, restaurants, supermarchés, grand frais, carrefour, ingrédients
- entertainment: films, séries, acteurs, Netflix, musique, cinéma
- tech: programmation, code, Python, JavaScript, GitHub, API
- health: santé, médecine, symptômes, médicaments, docteur
- sports: football, basketball, matchs, équipes, résultats sportifs
- tourism: voyages, hôtels, vacances, visiter, destinations
- news: actualités, informations récentes, politique
- knowledge: questions générales, histoire, science, définitions

EXEMPLES:
"bitcoin prix" → finance
"météo paris" → weather
"grand frais" → food
"film 2024" → entertainment
"restaurants italiens lyon" → food

REQUÊTE: "{query}"
CATÉGORIE (un mot):"""

# Prompt synthèse IA (court et efficace)  
SYNTHESIS_PROMPT = """Tu es WikiAsk, une IA experte de niveau universitaire.
Objectif: Fournir la réponse la plus complète, précise et sourcée possible.

Règles de Qualité:
1. Analyse Profonde: Ne reste pas en surface. Explique les "pourquoi" et "comment".
2. Fait Dense: Chaque phrase doit apporter une information. Pas de remplissage.
3. Citations: Mentionne explicitement les sources quand tu cites un fait (ex: "Selon Le Monde...").
4. Structure: Utilise des titres Markdown (##) clairs, des listes à puces pour la lisibilité.
5. Neutralité: Adopte un ton encyclopédique, objectif et professionnel.

Question: {query}

Contexte (Données Factuelles):
{context}

Ton rapport complet (minimum 400 mots si le sujet le permet) :"""


class SmartSearchV7:
    """
    Moteur de recherche v7.0
    - IA classifie TOUJOURS
    - Classification + SearXNG en parallèle
    - Contexte formaté (pas de JSON)
    """
    
    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None
        logger.info("🚀 SmartSearchV7 initialized - AI-FIRST")
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self.http_client is None or self.http_client.is_closed:
            self.http_client = httpx.AsyncClient(
                timeout=5.0,
                follow_redirects=True,
                headers={"User-Agent": "WikiAsk/7.0 (https://wikiask.io)"}
            )
        return self.http_client
    
    async def _call_groq(self, prompt: str, max_tokens: int = 10) -> Optional[str]:
        """Appel Groq rapide."""
        if not GROQ_API_KEY:
            return None
        try:
            client = await self._get_client()
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": 0
                },
                timeout=3.0
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.debug(f"Groq call failed: {e}")
        return None

    async def classify(self, query: str) -> str:
        """Classification IA (~200-300ms)."""
        result = await self._call_groq(CLASSIFY_PROMPT.format(query=query))
        if result:
            category = result.lower().strip()
            if category in DOMAIN_APIS or category in ["tech", "health", "sports", "tourism", "knowledge"]:
                logger.info(f"🤖 '{query[:30]}' → {category}")
                return category
        return "knowledge"

    async def fetch_searxng(self, query: str, lang: str = "fr", max_results: int = 40) -> List[Dict]:
        """Récupère liens via SearXNG avec cache."""
        # ⚡ Cache check
        cache_key = f"searxng:{query}:{lang}"
        cached = search_cache.get(cache_key)
        if cached:
            logger.info(f"⚡ SearXNG Cache HIT: {query[:30]}")
            return cached
        
        try:
            client = await self._get_client()
            url = f"{SEARXNG_URL}/search?q={quote(query)}&format=json&language={lang}"
            logger.info(f"🔍 SearXNG Call: {url}")
            
            resp = await client.get(url, timeout=3.0) # Strict 3s timeout
            
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                logger.info(f"✅ SearXNG: {len(results)} raw results")
                
                # Format results
                formatted = [
                    {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", "")[:200]}
                    for r in results[:max_results]
                ]
                
                # 🛡️ Apply content filter
                filtered = filter_search_results(formatted)
                logger.info(f"🛡️ After filter: {len(filtered)} clean results")
                
                # ⚡ Store in cache
                search_cache.set(cache_key, filtered, ttl=300)
                return filtered
            else:
                logger.warning(f"⚠️ SearXNG Error: {resp.status_code}")
        except httpx.TimeoutException:
            logger.error("❌ SearXNG Timeout (3s)")
        except Exception as e:
            logger.error(f"❌ SearXNG failed: {e}")
        return []

    async def fetch_images(self, query: str, max_results: int = 4) -> List[Dict]:
        """
        Récupère de BELLES images via Unsplash Source (pas besoin de clé API).
        Fallback: images thématiques fun basées sur des mots-clés.
        """
        images = []
        
        # 1. D'abord essayer SearXNG pour des images liées à la requête
        try:
            client = await self._get_client()
            url = f"{SEARXNG_URL}/search?q={quote(query)}&categories=images&format=json"
            resp = await client.get(url, timeout=2.0)
            
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                for r in results[:max_results * 2]:  # Fetch more to filter
                    img_src = r.get("img_src") or r.get("url")
                    title = r.get("title", query)[:50]
                    
                    # 🛡️ Filter inappropriate images
                    if img_src and img_src.startswith("http"):
                        if not is_domain_blocked(img_src) and not is_domain_blocked(title):
                            images.append({
                                "title": title,
                                "url": img_src,
                                "source": "search"
                            })
                    if len(images) >= max_results:
                        break
        except Exception as e:
            logger.debug(f"SearXNG images failed: {e}")
        
        # 2. Si pas assez d'images, utiliser Unsplash Source (gratuit, belles photos)
        if len(images) < max_results:
            # Mots-clés pour Unsplash basés sur la requête
            unsplash_keywords = query.replace(" ", "%20")[:50]
            
            # Fallback vers des thèmes fun si la requête est trop technique
            fun_themes = [
                "abstract,art", "landscape,nature", "technology,cyberpunk", 
                "city,night", "cozy,cafe", "space,stars", "library,books", "future,ai"
            ]
            
            needed = max_results - len(images)
            for i in range(needed):
                # Alterner entre requête utilisateur et thèmes fun
                if i % 2 == 0:
                    kw = unsplash_keywords
                    # Essayer d'utiliser l'image directe Unsplash (format plus stable)
                    img_url = f"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80" # Placeholder HD de qualité par défaut
                    # On utilise en réalité les mots clés dans l'URL Unsplash Source si elle remarche, 
                    # mais ici on va utiliser un service plus fiable comme Pollinations pour générer/chercher
                    img_url = f"https://image.pollinations.ai/prompt/{quote(query)}?width=800&height=450&nologo=true"
                else:
                    kw = fun_themes[i % len(fun_themes)]
                    img_url = f"https://image.pollinations.ai/prompt/{quote(kw)}?width=800&height=450&nologo=true"
                
                images.append({
                    "title": f"✨ Image IA ({query[:15]}...)",
                    "url": img_url,
                    "source": "pollinations-ai"
                })
        
        return images[:max_results]

    async def fetch_domain_api(self, query: str, category: str) -> str:
        """Récupère données API formatées en TEXTE."""
        config = DOMAIN_APIS.get(category)
        if not config:
            return ""
        
        try:
            # Extraire ville/query & Langue
            city = self._extract_city(query)
            # Gestion simple de la langue short (fr, en, es)
            lang_short = category.split("-")[0] if "-" in category else "fr"
            
            # Formater l'URL avec tous les paramètres possibles
            # Note: .format() ignorera les clés non utilisées dans la string
            url = config["url"].format(
                query=quote(query), 
                city=city, 
                lang=category, # Pour openweather/tmdb qui prennent fr, en
                lang_short=category[:2] # Pour newsapi qui prend fr, en
            )
            
            client = await self._get_client()
            resp = await client.get(url, timeout=3.0)
            
            if resp.status_code == 200:
                data = resp.json()
                # Formater en TEXTE LISIBLE
                formatted = config["format"](data)
                if formatted:
                    return f"📊 DONNÉES {category.upper()}:\n{formatted}"
        except Exception as e:
            logger.debug(f"Domain API failed: {e}")
        return ""

    def _extract_city(self, query: str) -> str:
        """Extrait la ville de la requête."""
        # Liste étendue avec plus de villes
        cities = [
            # France
            "paris", "lyon", "marseille", "nice", "bordeaux", "toulouse", 
            "nantes", "strasbourg", "lille", "montpellier", "cannes",
            # Europe
            "london", "berlin", "rome", "madrid", "barcelona", "amsterdam",
            "brussels", "vienna", "prague", "lisbon", "dublin", "zurich",
            "munich", "milan", "athens", "stockholm", "oslo", "copenhagen",
            # Moyen-Orient
            "tel aviv", "jerusalem", "dubai", "abu dhabi", "doha", "riyadh",
            "amman", "beirut", "istanbul", "cairo", "casablanca",
            # Amériques
            "new york", "los angeles", "chicago", "miami", "san francisco",
            "toronto", "vancouver", "montreal", "mexico city", "sao paulo",
            # Asie
            "tokyo", "osaka", "seoul", "beijing", "shanghai", "hong kong",
            "singapore", "bangkok", "mumbai", "delhi", "sydney", "melbourne"
        ]
        q_lower = query.lower()
        
        # Chercher d'abord les noms composés (tel aviv, new york, etc.)
        for city in sorted(cities, key=len, reverse=True):  # Plus longs d'abord
            if city in q_lower:
                return city
        
        # Si pas trouvé dans la liste, extraire le dernier mot significatif
        # Exclure les mots-clés météo
        stop_words = ["météo", "meteo", "weather", "temps", "temperature", "température", 
                      "demain", "aujourd'hui", "semaine", "prévisions", "forecast"]
        words = [w for w in query.lower().split() if w not in stop_words and len(w) > 2]
        
        if words:
            # Retourner le dernier mot comme ville potentielle
            return words[-1]
        
        return "paris"  # Fallback par défaut

    # ══════════════════════════════════════════════════════════════
    # MODE SEARCH (rapide, ~0.5-1s)
    # ══════════════════════════════════════════════════════════════
    
    async def search(self, query: str, lang: str = "fr") -> Dict[str, Any]:
        """
        Mode SEARCH: Classification + Liens (pas d'IA de synthèse)
        - Classification IA + SearXNG + Images en PARALLÈLE
        - API domaine si pertinent
        """
        start = datetime.now()
        
        # PARALLÈLE: Classification + SearXNG + Images
        classify_task = self.classify(query)
        links_task = self.fetch_searxng(query, lang)
        images_task = self.fetch_images(query)
        
        category, links, images = await asyncio.gather(classify_task, links_task, images_task)
        
        # API domaine (optionnel, rapide) avec langue
        domain_context = await self.fetch_domain_api(query, lang)
        
        elapsed = (datetime.now() - start).total_seconds() * 1000
        
        return {
            "success": True,
            "mode": "search",
            "query": query,
            "category": category,
            "domain_context": domain_context,
            "links": links,
            "links_count": len(links),
            "images": images,
            "total_time_ms": round(elapsed)
        }

    # ══════════════════════════════════════════════════════════════
    # MODE AI ANALYSIS (~5-10s)
    # ══════════════════════════════════════════════════════════════
    
    async def ai_analysis(self, query: str, lang: str = "fr") -> Dict[str, Any]:
        """
        Mode AI ANALYSIS EXPERT (Multi-Report Tri-Search):
        Génère 3 RAPPORTS THÉMATIQUES DISTINCTS en parallèle:
        1. Vue d'ensemble
        2. Faits & Données
        3. Recherche & Prospective
        """
        start = datetime.now()
        
        # DÉFINITION DES 3 THÈMES
        themes = [
            {
                "id": "overview",
                "title": "📊 Vue d'Ensemble",
                "query_suffix": "",
                "prompt": f"""Rédige un RÉSUMÉ EXÉCUTIF complet sur: {{query}}
                
Contexte:
{{context}}

Structure:
## Introduction
[Définition et importance du sujet]

## Points Clés
- [3-5 points essentiels]

## Conclusion
[Synthèse en 2-3 phrases]

Minimum 300 mots. Cite tes sources."""
            },
            {
                "id": "facts",
                "title": "📈 Faits & Données",
                "query_suffix": " statistics data facts numbers",
                "prompt": f"""Compile les FAITS et DONNÉES CHIFFRÉES sur: {{query}}

Contexte:
{{context}}

Structure:
## Chiffres Clés
| Indicateur | Valeur | Source |
|------------|--------|--------|
[Tableau avec données réelles]

## Statistiques Importantes
- [Liste de stats avec sources]

## Tendances
[Évolution récente avec dates]

RÈGLE: Uniquement des données VÉRIFIABLES du contexte. Pas d'invention."""
            },
            {
                "id": "research",
                "title": "🔬 Recherche & Prospective",
                "query_suffix": " latest research analysis future trends",
                "prompt": f"""Analyse les RECHERCHES RÉCENTES et PERSPECTIVES sur: {{query}}

Contexte:
{{context}}

Structure:
## Études Récentes
[Résumé des recherches citées]

## Innovations & Découvertes
- [Nouveautés du domaine]

## Perspectives Futures
[Prédictions basées sur les sources]

## Sources Académiques
[Liste des références]

Minimum 300 mots. Ton académique et prospectif."""
            }
        ]
        
        logger.info(f"🧠 MULTI-REPORT DEEP SEARCH: {query}")
        
        # 1. LANCEMENT PARALLÈLE DES 3 RECHERCHES
        search_tasks = [
            self.fetch_searxng(query + theme["query_suffix"], lang=lang, max_results=15)
            for theme in themes
        ]
        results_list = await asyncio.gather(*search_tasks)
        
        # Classification et API Domaine
        category = await self.classify(query)
        domain_context = await self.fetch_domain_api(query, lang)
        
        # 🧠 MEGA BRAIN - Interroge 50+ APIs gratuites
        brain_results = await mega_brain.query_brain(query, lang=lang, max_apis=8)
        brain_context = mega_brain.format_results_for_ai(brain_results)
        
        logger.info(f"🧠 MegaBrain: {brain_results['apis_successful']}/{brain_results['apis_queried']} APIs OK in {brain_results['elapsed_ms']}ms")
        
        # 2. PRÉPARATION DES CONTEXTES PAR THÈME
        theme_contexts = []
        all_links = []
        seen_urls = set()
        
        for i, theme in enumerate(themes):
            context_parts = []
            theme_links = []
            
            if domain_context:
                context_parts.append(f"🔌 DONNÉES TEMPS RÉEL:\n{domain_context}")
            
            # 🧠 Ajouter données du MegaBrain
            if brain_context:
                context_parts.append(f"🧠 DONNÉES MULTI-SOURCES ({brain_results['apis_successful']} APIs):\n{brain_context}")
            
            for link in results_list[i]:
                url = link.get("url")
                snippet = link.get("snippet", "").strip()
                if url and url not in seen_urls and len(snippet) > 40:
                    seen_urls.add(url)
                    all_links.append(link)
                    theme_links.append(link)
                    context_parts.append(f"• [{link.get('title', 'Source')}]: {snippet}")
            
            theme_contexts.append({
                "theme": theme,
                "context": "\n\n".join(context_parts[:20]),
                "sources_count": len(theme_links)
            })
        
        # 3. GÉNÉRATION PARALLÈLE DES 3 RAPPORTS
        async def generate_report(theme_data):
            theme = theme_data["theme"]
            context = theme_data["context"]
            
            if not context:
                return {
                    "id": theme["id"],
                    "title": theme["title"],
                    "content": "Aucune source disponible pour ce thème.",
                    "sources_count": 0
                }
            
            prompt = theme["prompt"].format(query=query, context=context)
            prompt += "\n\nANTI-HALLUCINATION: Base-toi UNIQUEMENT sur le contexte fourni."
            
            content = await self._call_groq(prompt, max_tokens=800)
            
            return {
                "id": theme["id"],
                "title": theme["title"],
                "content": content or "Génération échouée.",
                "sources_count": theme_data["sources_count"]
            }
        
        report_tasks = [generate_report(tc) for tc in theme_contexts]
        reports = await asyncio.gather(*report_tasks)
        
        # Images
        images = await self.fetch_images(query)
        
        elapsed = (datetime.now() - start).total_seconds() * 1000
        
        return {
            "success": True,
            "mode": "multi-report-expert",
            "query": query,
            "category": category,
            "reports": reports,  # 3 rapports distincts!
            "response": reports[0]["content"] if reports else "",  # Fallback pour compatibilité
            "links": all_links[:40],
            "images": images,
            "total_time_ms": round(elapsed)
        }


    async def close(self):
        if self.http_client and not self.http_client.is_closed:
            await self.http_client.aclose()


# Singleton
smart_search_v7 = SmartSearchV7()
