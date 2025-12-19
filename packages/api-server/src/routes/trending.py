"""
📰 TRENDING ARTICLES ENDPOINT
==============================
Articles par défaut à afficher avant recherche.
- Tech/IA pour Recherche Rapide
- Science pour Recherche Approfondie
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse
import httpx
import asyncio
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
GNEWS_API_KEY = os.getenv("GNEWS_API_KEY", "")

# Images par défaut par catégorie
DEFAULT_IMAGES = {
    "tech": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=200&fit=crop",
    "ai": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop",
    "science": "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400&h=200&fit=crop",
    "health": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=200&fit=crop",
    "cinema": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=200&fit=crop",
    "food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=200&fit=crop",
    "lifestyle": "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=200&fit=crop",
    "travel": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=200&fit=crop",
    "default": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=200&fit=crop"
}


# ═══════════════════════════════════════════════════════════════════════════════
# FETCH TECH/IA NEWS
# ═══════════════════════════════════════════════════════════════════════════════

async def fetch_tech_news(limit: int = 6) -> list:
    """Récupère les actualités tech/IA."""
    articles = []
    
    try:
        # GNews API (gratuit, 100 req/jour)
        if GNEWS_API_KEY:
            async with httpx.AsyncClient(timeout=5.0) as client:
                url = f"https://gnews.io/api/v4/top-headlines?category=general&lang=fr&country=fr&max={limit}&apikey={GNEWS_API_KEY}"
                resp = await client.get(url)
                
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("articles", [])[:limit]:
                        articles.append({
                            "title": item.get("title", ""),
                            "description": item.get("description", "")[:150] if item.get("description") else "",
                            "image": item.get("image") or DEFAULT_IMAGES["default"],
                            "url": item.get("url", ""),
                            "source": item.get("source", {}).get("name", "GNews"),
                            "date": item.get("publishedAt", "")[:16].replace("T", " ") if item.get("publishedAt") else ""
                        })
    except Exception as e:
        logger.warning(f"GNews API error: {e}")
    
    # Fallback NewsAPI
    if not articles and NEWS_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                url = f"https://newsapi.org/v2/top-headlines?country=fr&pageSize={limit}&apiKey={NEWS_API_KEY}"
                resp = await client.get(url)
                
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("articles", [])[:limit]:
                        articles.append({
                            "title": item.get("title", ""),
                            "description": (item.get("description") or "")[:150],
                            "image": item.get("urlToImage") or DEFAULT_IMAGES["default"],
                            "url": item.get("url", ""),
                            "source": item.get("source", {}).get("name", "NewsAPI"),
                            "date": item.get("publishedAt", "")[:16].replace("T", " ") if item.get("publishedAt") else ""
                        })
        except Exception as e:
            logger.warning(f"NewsAPI error: {e}")
    
    # Articles statiques de secours
    if not articles:
        articles = [
            {
                "title": "L'actualité en France : ce qu'il faut retenir",
                "description": "Retrouvez les derniers événements marquants de la journée en France et dans le monde.",
                "image": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&h=300&fit=crop",
                "url": "https://www.lemonde.fr/",
                "source": "WikiAsk",
                "date": "À l'instant"
            },
            {
                "title": "Les nouvelles frontières de la tech en 2024",
                "description": "Quantum computing, IA, robotique - découvrez les technologies qui façonnent notre futur.",
                "image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&h=300&fit=crop",
                "url": "https://www.futura-sciences.com/tech/",
                "source": "WikiAsk",
                "date": "2025"
            },
            {
                "title": "Le futur de la mobilité urbaine",
                "description": "Entre véhicules autonomes et drones taxis, comment nous déplacerons-nous demain ?",
                "image": "https://images.unsplash.com/photo-1555529733-0e670560f7e1?w=500&h=300&fit=crop",
                "url": "#",
                "source": "WikiAsk",
                "date": "2025"
            }
        ]
    
    return articles


# ═══════════════════════════════════════════════════════════════════════════════
# FETCH SCIENCE NEWS
# ═══════════════════════════════════════════════════════════════════════════════

async def fetch_science_news(limit: int = 6) -> list:
    """Récupère les actualités scientifiques."""
    articles = []
    
    try:
        # GNews API Science
        if GNEWS_API_KEY:
            async with httpx.AsyncClient(timeout=5.0) as client:
                url = f"https://gnews.io/api/v4/top-headlines?category=science&lang=fr&max={limit}&apikey={GNEWS_API_KEY}"
                resp = await client.get(url)
                
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("articles", [])[:limit]:
                        articles.append({
                            "title": item.get("title", ""),
                            "description": item.get("description", "")[:150] if item.get("description") else "",
                            "image": item.get("image") or DEFAULT_IMAGES["science"],
                            "url": item.get("url", ""),
                            "source": item.get("source", {}).get("name", "Science"),
                            "date": item.get("publishedAt", "")[:10] if item.get("publishedAt") else "",
                            "type": "science"
                        })
    except Exception as e:
        logger.warning(f"GNews Science error: {e}")
    
    # Fallback PubMed trending (dernières publications)
    if len(articles) < 3:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # EUtils trending
                url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=artificial+intelligence+OR+machine+learning&retmax=5&retmode=json&sort=date"
                resp = await client.get(url)
                
                if resp.status_code == 200:
                    data = resp.json()
                    ids = data.get("esearchresult", {}).get("idlist", [])[:3]
                    
                    if ids:
                        # Récupérer les détails
                        summary_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={','.join(ids)}&retmode=json"
                        summary_resp = await client.get(summary_url)
                        
                        if summary_resp.status_code == 200:
                            summary_data = summary_resp.json()
                            for pmid in ids:
                                item = summary_data.get("result", {}).get(pmid, {})
                                if item:
                                    articles.append({
                                        "title": item.get("title", "")[:100],
                                        "description": f"Publication scientifique - {item.get('source', 'PubMed')}",
                                        "image": DEFAULT_IMAGES["science"],
                                        "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                                        "source": "PubMed",
                                        "date": item.get("pubdate", "")[:10] if item.get("pubdate") else "",
                                        "type": "peer_reviewed"
                                    })
        except Exception as e:
            logger.warning(f"PubMed error: {e}")
    
    # Articles statiques de secours
    if not articles:
        articles = [
            {
                "title": "Dernières avancées en neurosciences",
                "description": "Les chercheurs font des progrès significatifs dans la compréhension du cerveau humain.",
                "image": "https://images.unsplash.com/photo-1559757175-9e351c95369d?w=500&h=300&fit=crop",
                "url": "https://www.nature.com/subjects/neuroscience",
                "source": "Nature",
                "date": "2025",
                "type": "science"
            },
            {
                "title": "L'IA au service de la recherche médicale",
                "description": "Comment l'intelligence artificielle accélère les découvertes en santé.",
                "image": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=500&h=300&fit=crop",
                "url": "https://pubmed.ncbi.nlm.nih.gov/",
                "source": "PubMed",
                "date": "2025",
                "type": "peer_reviewed"
            },
            {
                "title": "Exploration spatiale : cap sur Mars",
                "description": "Les nouvelles missions qui préparent l'arrivée de l'homme sur la planète rouge.",
                "image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&h=300&fit=crop",
                "url": "#",
                "source": "ESA",
                "date": "2025",
                "type": "science"
            }
        ]
    
    return articles

async def fetch_lifestyle_news(limit: int = 6) -> list:
    """Récupère les actualités lifestyle/culture (par défaut statiques pour l'instant)."""
    # En attendant une API lifestyle, on met des beaux contenus par défaut
    return [
        {
            "title": "Les 10 films les plus attendus de 2025",
            "description": "De la science-fiction épique aux drames intimistes, l'année cinéma promet d'être grandiose.",
            "image": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&h=300&fit=crop",
            "url": "#",
            "source": "Culture",
            "date": "2025"
        },
        {
            "title": "Gastronomie : le retour aux sources",
            "description": "Les chefs étoilés redécouvrent les saveurs authentiques et locales.",
            "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&h=300&fit=crop",
            "url": "#",
            "source": "Food",
            "date": "2025"
        },
        {
            "title": "Voyage : les destinations cachées de 2025",
            "description": "Oubliez les sentiers battus, découvrez ces perles rares pour votre prochaine aventure.",
            "image": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&h=300&fit=crop",
            "url": "#",
            "source": "Voyage",
            "date": "2025"
        }
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/api/trending/tech")
async def get_trending_tech(limit: int = 6):
    """Articles Tech/IA pour la Recherche Rapide."""
    try:
        articles = await asyncio.wait_for(
            fetch_tech_news(limit),
            timeout=8.0
        )
        return {
            "success": True,
            "category": "tech",
            "articles": articles,
            "count": len(articles)
        }
    except Exception as e:
        logger.error(f"Trending tech error: {e}")
        return {"success": False, "error": str(e), "articles": []}


@router.get("/api/trending/science")
async def get_trending_science(limit: int = 6):
    """Articles scientifiques pour la Recherche Approfondie."""
    try:
        articles = await asyncio.wait_for(
            fetch_science_news(limit),
            timeout=8.0
        )
        return {
            "success": True,
            "category": "science",
            "articles": articles,
            "count": len(articles)
        }
    except Exception as e:
        logger.error(f"Trending science error: {e}")
        return {"success": False, "error": str(e), "articles": []}


@router.get("/api/trending")
async def get_trending(category: str = "tech", limit: int = 6):
    """Articles trending par catégorie."""
    if category == "science":
        return await get_trending_science(limit)
    if category == "lifestyle":
        articles = await fetch_lifestyle_news(limit)
        return {"success": True, "category": "lifestyle", "articles": articles, "count": len(articles)}
    
    return await get_trending_tech(limit)
