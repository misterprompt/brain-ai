"""
💻 TECH INTERFACE
=================
Gère toutes les APIs Tech : GitHub, StackOverflow, NPM, PyPI.
Isolé et robuste.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from urllib.parse import quote
import re

from .base import BaseInterface


class TechInterface(BaseInterface):
    """
    Expert Tech : Code, Développement, Packages.
    """
    
    DOMAIN_NAME = "tech"
    
    KEYWORDS = [
        # Langages
        "python", "javascript", "js", "typescript", "ts", "java", "c++", "cpp",
        "c#", "csharp", "rust", "go", "golang", "php", "ruby", "swift", "kotlin",
        # Frameworks Frontend
        "react", "reactjs", "vue", "vuejs", "angular", "svelte", "nextjs", "nuxt",
        # Frameworks Backend
        "node", "nodejs", "express", "django", "flask", "fastapi", "spring",
        "laravel", "rails", "ruby on rails", "dotnet", ".net",
        # Package managers
        "npm", "pip", "yarn", "pnpm", "composer", "cargo", "maven", "gradle",
        # Git/Versionning
        "github", "gitlab", "git", "bitbucket", "repo", "repository",
        # DevOps
        "docker", "kubernetes", "k8s", "ci/cd", "jenkins", "terraform", "ansible",
        "aws", "azure", "gcp", "cloud", "serverless", "lambda",
        # Databases
        "database", "sql", "mysql", "postgresql", "postgres", "mongodb", "redis",
        "elasticsearch", "sqlite", "firebase", "supabase",
        # AI/ML
        "machine learning", "ml", "deep learning", "ai", "artificial intelligence",
        "chatgpt", "gpt", "llm", "openai", "huggingface", "tensorflow", "pytorch",
        "langchain", "ollama", "llama", "claude", "gemini",
        # Développement général
        "code", "coder", "programmer", "développer", "developer", "api", "rest",
        "graphql", "websocket", "bug", "erreur", "error", "debug", "debugging",
        "stackoverflow", "framework", "library", "package", "module",
        # Tutoriels
        "tutorial", "tutoriel", "apprendre", "learn", "installer", "installation",
        "configurer", "setup", "comment faire", "how to"
    ]
    
    PATTERNS = [
        r"\b(python|javascript|typescript|react|vue|node|npm|pip)\b",
        r"\bcomment\s+(coder|programmer|installer|configurer)\b",
        r"\berreur\s+(code|python|javascript|npm)\b",
        r"\b(git|github|gitlab)\b.*\b(repo|repository|clone|push)\b",
    ]
    
    # ══════════════════════════════════════════════════════════════
    # EXTRACTION DE PARAMÈTRES
    # ══════════════════════════════════════════════════════════════
    
    def extract_params(self, query: str) -> Dict[str, Any]:
        """Extrait le langage/framework mentionné."""
        q_lower = query.lower()
        params = {"query": query, "search_term": quote(query)}
        
        # Détecter le langage principal
        languages = ["python", "javascript", "typescript", "java", "go", "rust", "php", "ruby", "c++", "c#"]
        for lang in languages:
            if lang in q_lower:
                params["language"] = lang
                break
        
        # Détecter les frameworks
        frameworks = ["react", "vue", "angular", "django", "flask", "fastapi", "express", "nextjs", "nuxt"]
        for fw in frameworks:
            if fw in q_lower:
                params["framework"] = fw
                break
        
        return params
    
    # ══════════════════════════════════════════════════════════════
    # MODE SPEED
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_speed_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Speed : GitHub search (repos populaires).
        """
        start = datetime.now()
        
        search_term = params.get("search_term", quote(query))
        
        # GitHub : recherche de repos
        url = f"https://api.github.com/search/repositories?q={search_term}&sort=stars&per_page=5"
        
        data = await self._fetch_json(url, timeout=self.SPEED_TIMEOUT)
        
        if not data or "items" not in data:
            return self._build_response(
                success=False,
                data={},
                context="Impossible de récupérer les données GitHub.",
                sources=[],
                start_time=start
            )
        
        # Formater le contexte
        context_lines = ["💻 RESSOURCES GITHUB POPULAIRES:\n"]
        
        for repo in data["items"][:5]:
            name = repo.get("full_name", "?")
            stars = repo.get("stargazers_count", 0)
            desc = repo.get("description", "")[:100] if repo.get("description") else "Pas de description"
            url_repo = repo.get("html_url", "")
            context_lines.append(f"⭐ {name} ({stars:,} stars)")
            context_lines.append(f"   {desc}")
            context_lines.append(f"   🔗 {url_repo}\n")
        
        return self._build_response(
            success=True,
            data=data,
            context="\n".join(context_lines),
            sources=["GitHub"],
            start_time=start
        )
    
    # ══════════════════════════════════════════════════════════════
    # MODE DEEP
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_deep_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Deep : GitHub + StackOverflow + NPM/PyPI.
        """
        start = datetime.now()
        
        search_term = params.get("search_term", quote(query))
        
        urls = [
            # GitHub repos
            f"https://api.github.com/search/repositories?q={search_term}&sort=stars&per_page=10",
            # StackOverflow questions
            f"https://api.stackexchange.com/2.3/search?order=desc&sort=relevance&intitle={search_term}&site=stackoverflow&pagesize=5",
            # NPM packages
            f"https://registry.npmjs.org/-/v1/search?text={search_term}&size=5",
            # Dev.to articles
            f"https://dev.to/api/articles?tag={search_term}&top=7&per_page=5",
        ]
        
        results = await self._fetch_multiple(urls, timeout=self.DEEP_TIMEOUT)
        
        sources = []
        aggregated = {}
        
        if results[0] and "items" in results[0]:
            sources.append("GitHub")
            aggregated["github"] = results[0]["items"][:10]
        
        if results[1] and "items" in results[1]:
            sources.append("StackOverflow")
            aggregated["stackoverflow"] = results[1]["items"][:5]
        
        if results[2] and "objects" in results[2]:
            sources.append("NPM")
            aggregated["npm"] = results[2]["objects"][:5]
        
        if results[3]:
            sources.append("Dev.to")
            aggregated["devto"] = results[3][:5] if isinstance(results[3], list) else []
        
        # Construire contexte riche
        context_parts = ["💻 RESSOURCES TECHNIQUES COMPLÈTES:\n"]
        
        # GitHub
        if aggregated.get("github"):
            context_parts.append("📁 REPOSITORIES GITHUB:")
            for repo in aggregated["github"][:5]:
                context_parts.append(
                    f"   ⭐ {repo.get('full_name')} ({repo.get('stargazers_count', 0):,} stars)"
                )
                if repo.get("description"):
                    context_parts.append(f"      {repo['description'][:80]}")
        
        # StackOverflow
        if aggregated.get("stackoverflow"):
            context_parts.append("\n❓ QUESTIONS STACKOVERFLOW:")
            for q in aggregated["stackoverflow"][:3]:
                title = q.get("title", "?")
                score = q.get("score", 0)
                answered = "✅" if q.get("is_answered") else "❌"
                context_parts.append(f"   {answered} [{score}] {title[:60]}")
        
        # NPM
        if aggregated.get("npm"):
            context_parts.append("\n📦 PACKAGES NPM:")
            for pkg in aggregated["npm"][:3]:
                p = pkg.get("package", {})
                name = p.get("name", "?")
                desc = p.get("description", "")[:50]
                context_parts.append(f"   • {name}: {desc}")
        
        return self._build_response(
            success=len(sources) > 0,
            data=aggregated,
            context="\n".join(context_parts),
            sources=sources,
            start_time=start
        )
