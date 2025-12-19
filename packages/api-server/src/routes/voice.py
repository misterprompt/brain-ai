# -*- coding: utf-8 -*-
"""
🎤 VOICE ENDPOINTS - API Vocale
================================
Endpoints pour la synthèse vocale et transcription.
"""

import base64
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from fastapi.responses import Response
from typing import Optional

from services.voice_service import (
    tts_service,
    stt_service,
    get_voices,
    VOICE_MAP
)

router = APIRouter()


@router.get("/api/voice/speak")
async def text_to_speech(
    text: str = Query(..., min_length=1, max_length=5000, description="Text to speak"),
    lang: str = Query("fr", description="Language code (fr, en, es, etc.)"),
    voice: Optional[str] = Query(None, description="Specific voice name"),
    format: str = Query("mp3", description="Output format: mp3 or base64")
):
    """
    🔊 Convertit du texte en audio.
    
    Args:
        text: Texte à lire (max 5000 caractères)
        lang: Code langue
        voice: Voix spécifique ou auto
        format: "mp3" pour audio brut, "base64" pour encodé
        
    Returns:
        Audio MP3 ou base64 selon le format demandé
    """
    audio_data = await tts_service.synthesize(text, lang, voice)
    
    if not audio_data:
        raise HTTPException(
            status_code=500, 
            detail="TTS synthesis failed. Make sure edge-tts is installed."
        )
    
    if format == "base64":
        return {
            "success": True,
            "audio_base64": base64.b64encode(audio_data).decode('utf-8'),
            "format": "mp3",
            "length_bytes": len(audio_data),
            "text_length": len(text),
            "language": lang
        }
    else:
        # Retourner l'audio MP3 directement
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'attachment; filename="speech.mp3"',
                "X-Text-Length": str(len(text)),
                "X-Language": lang
            }
        )


@router.post("/api/voice/transcribe")
async def speech_to_text(
    audio: UploadFile = File(..., description="Audio file (webm, mp3, wav)"),
    lang: Optional[str] = Query(None, description="Language hint"),
    prompt: Optional[str] = Query(None, description="Context prompt")
):
    """
    🎤 Transcrit de l'audio en texte.
    
    Args:
        audio: Fichier audio
        lang: Indice de langue (optionnel)
        prompt: Contexte pour améliorer la transcription
        
    Returns:
        Texte transcrit
    """
    # Lire le fichier audio
    audio_data = await audio.read()
    
    if len(audio_data) > 25 * 1024 * 1024:  # 25MB max
        raise HTTPException(status_code=400, detail="Audio file too large (max 25MB)")
    
    # Transcrire
    text = await stt_service.transcribe(audio_data, lang, prompt)
    
    if text is None:
        raise HTTPException(
            status_code=500,
            detail="Transcription failed. Check GROQ_API_KEY or OPENAI_API_KEY."
        )
    
    return {
        "success": True,
        "text": text,
        "language": lang or "auto",
        "audio_size_bytes": len(audio_data)
    }


@router.get("/api/voice/voices")
async def list_voices(
    lang: Optional[str] = Query(None, description="Filter by language")
):
    """
    📋 Liste les voix disponibles.
    
    Args:
        lang: Filtrer par langue (optionnel)
        
    Returns:
        Liste des voix par langue
    """
    voices = get_voices(lang)
    
    return {
        "success": True,
        "count": len(voices),
        "voices": voices,
        "supported_languages": list(VOICE_MAP.keys())
    }


@router.get("/api/voice/test")
async def test_voice(
    text: str = Query("Bonjour, je suis WikiAsk, votre assistant de recherche intelligent.", 
                      description="Test text"),
    lang: str = Query("fr", description="Language")
):
    """
    🧪 Test rapide de la synthèse vocale.
    
    Returns:
        Audio MP3 de test
    """
    audio_data = await tts_service.synthesize(text, lang)
    
    if not audio_data:
        raise HTTPException(status_code=500, detail="TTS test failed")
    
    return Response(
        content=audio_data,
        media_type="audio/mpeg"
    )
