# -*- coding: utf-8 -*-
"""
🌍 LANGUAGE ENDPOINTS - API Multilingue
========================================
Endpoints pour la gestion des langues et traductions.
"""

from fastapi import APIRouter, Query
from typing import Optional

from services.translation_service import (
    translation_service,
    detect_language,
    get_supported_languages,
    get_ui_text,
    is_rtl,
    UI_TRANSLATIONS
)

router = APIRouter()


@router.get("/api/languages")
async def list_languages():
    """
    Liste toutes les langues supportées.
    
    Returns:
        Liste des langues avec code, nom, flag et support RTL
    """
    languages = get_supported_languages()
    
    return {
        "success": True,
        "count": len(languages),
        "languages": [
            {
                "code": code,
                "name": info["name"],
                "flag": info["flag"],
                "rtl": info.get("rtl", False)
            }
            for code, info in languages.items()
        ],
        "default": "fr"
    }


@router.get("/api/languages/detect")
async def detect_text_language(text: str = Query(..., min_length=2)):
    """
    Détecte la langue d'un texte.
    
    Args:
        text: Texte à analyser
        
    Returns:
        Code langue détecté avec confiance
    """
    detected = detect_language(text)
    lang_info = get_supported_languages().get(detected, {})
    
    return {
        "success": True,
        "text": text[:100],
        "detected_language": {
            "code": detected,
            "name": lang_info.get("name", detected),
            "flag": lang_info.get("flag", "🌐"),
            "rtl": lang_info.get("rtl", False)
        }
    }


@router.get("/api/translate")
async def translate_text(
    text: str = Query(..., min_length=1, max_length=5000),
    target: str = Query(..., min_length=2, max_length=5, description="Target language code"),
    source: str = Query("auto", description="Source language code (auto for detection)")
):
    """
    Traduit un texte vers la langue cible.
    
    Args:
        text: Texte à traduire
        target: Code langue cible (fr, en, es, etc.)
        source: Code langue source (auto = détection automatique)
        
    Returns:
        Texte traduit avec métadonnées
    """
    # Détecter la langue source si auto
    if source == "auto":
        source = detect_language(text)
    
    # Traduire
    translated = await translation_service.translate(text, target, source)
    
    return {
        "success": True,
        "original": {
            "text": text,
            "language": source
        },
        "translated": {
            "text": translated,
            "language": target
        }
    }


@router.get("/api/ui-translations")
async def get_ui_translations(
    lang: str = Query("fr", description="Language code for UI translations")
):
    """
    Récupère les traductions UI pour une langue.
    
    Args:
        lang: Code langue
        
    Returns:
        Dictionnaire des traductions UI
    """
    translations = UI_TRANSLATIONS.get(lang, UI_TRANSLATIONS.get("en", {}))
    lang_info = get_supported_languages().get(lang, {})
    
    return {
        "success": True,
        "language": {
            "code": lang,
            "name": lang_info.get("name", lang),
            "rtl": lang_info.get("rtl", False)
        },
        "translations": translations
    }


@router.get("/api/translate/batch")
async def translate_batch(
    text: str = Query(..., description="Texts separated by |"),
    target: str = Query(..., description="Target language"),
    source: str = Query("auto", description="Source language")
):
    """
    Traduit plusieurs textes en une requête.
    
    Args:
        text: Textes séparés par |
        target: Langue cible
        source: Langue source
        
    Returns:
        Liste des traductions
    """
    texts = text.split("|")[:10]  # Max 10 textes
    
    if source == "auto" and texts:
        source = detect_language(texts[0])
    
    results = []
    for t in texts:
        translated = await translation_service.translate(t.strip(), target, source)
        results.append({
            "original": t.strip(),
            "translated": translated
        })
    
    return {
        "success": True,
        "source_language": source,
        "target_language": target,
        "count": len(results),
        "translations": results
    }
