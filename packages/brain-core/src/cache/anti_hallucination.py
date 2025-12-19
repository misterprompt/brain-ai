"""
🛡️ ANTI-HALLUCINATION GUARDRAILS
=================================
Règles strictes pour éviter les inventions.
"""


def get_grounded_prompt(base_prompt: str, sources: list = None) -> str:
    """
    Ajoute des guardrails anti-hallucination au prompt.
    Force l'IA à citer ses sources et ne pas inventer.
    """
    guardrails = """
⚠️ RÈGLES STRICTES - NE PAS ENFREINDRE:

1. GROUNDING OBLIGATOIRE
   - Toute affirmation factuelle DOIT être liée aux sources fournies
   - Si une info n'est pas dans les sources, dis "selon mes connaissances générales"
   - N'invente JAMAIS de données chiffrées, dates, ou faits

2. INCERTITUDE
   - Si tu n'es pas sûr, utilise: "il semble que", "d'après les sources", "probablement"
   - Si les sources se contredisent, signale-le clairement

3. CITATIONS
   - Quand tu utilises une source, mentionne-la naturellement
   - Exemple: "Selon [source], ..." ou "D'après les informations trouvées, ..."

4. LIMITES
   - Ne pas inventer de statistiques
   - Ne pas créer de citations fictives
   - Ne pas attribuer des propos à des personnes sans source
"""
    
    source_context = ""
    if sources:
        source_context = "\n📚 SOURCES DISPONIBLES:\n"
        for i, src in enumerate(sources[:5], 1):
            title = src.get("title", "Source")
            source_context += f"{i}. {title}\n"
    
    return f"{guardrails}{source_context}\n\n{base_prompt}"


def validate_response(response: str, sources: list = None) -> dict:
    """
    Valide qu'une réponse ne contient pas d'hallucinations évidentes.
    Retourne un score de confiance et des warnings.
    """
    warnings = []
    confidence = 1.0
    
    # Patterns suspects
    suspect_patterns = [
        ("selon une étude de 2024", "Date future suspecte"),
        ("100% des", "Statistique absolue suspecte"),
        ("tous les experts", "Généralisation suspecte"),
        ("il est prouvé que", "Affirmation catégorique sans source"),
        ("scientifiquement prouvé", "Affirmation scientifique sans citation"),
    ]
    
    response_lower = response.lower()
    for pattern, warning in suspect_patterns:
        if pattern in response_lower:
            warnings.append(warning)
            confidence -= 0.1
    
    # Vérifie la longueur (réponses très longues = plus de risque)
    if len(response) > 3000:
        warnings.append("Réponse très longue - vérification recommandée")
        confidence -= 0.1
    
    # Vérifie la présence de citations si sources fournies
    if sources and len(sources) > 0:
        citation_keywords = ["selon", "d'après", "source", "trouvé", "indique"]
        has_citation = any(kw in response_lower for kw in citation_keywords)
        if not has_citation:
            warnings.append("Pas de citations alors que des sources sont disponibles")
            confidence -= 0.15
    
    return {
        "confidence": max(0.3, min(1.0, confidence)),
        "confidence_level": "élevé" if confidence > 0.8 else "moyen" if confidence > 0.6 else "faible",
        "warnings": warnings,
        "requires_review": confidence < 0.6
    }


# Prompts anti-hallucination pour différents contextes
SEARCH_SYNTHESIS_PROMPT = """Tu synthétises des résultats de recherche.

RÈGLES:
- Utilise UNIQUEMENT les informations des sources fournies
- Si une info n'est pas dans les sources, ne l'invente pas
- Mentionne d'où vient chaque affirmation importante
- Si les sources se contredisent, signale-le
- Style: clair, concis, factuel"""

CHAT_GROUNDED_PROMPT = """Tu es un assistant intelligent et honnête.

RÈGLES:
- Réponds dans la langue de l'utilisateur
- Si tu n'es pas sûr, dis-le clairement
- Utilise tes connaissances générales mais ne fabrique pas de faits
- Pour les données récentes (météo, prix, actualités), précise que tu n'as pas l'info en temps réel si c'est le cas
- Sois utile mais honnête sur tes limites"""
