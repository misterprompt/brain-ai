"""
💬 CHAT ENDPOINT v2
====================
Intelligent conversational AI with streaming, research, and sources.
Uses the Smart Chat Agent for multi-step reasoning.
"""

import asyncio
import json
import logging
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import uuid

from services.smart_chat_agent import smart_agent
from services.chat_memory import chat_memory

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# STREAMING CHAT
# =============================================================================

async def chat_stream_generator(
    message: str,
    conversation_id: str,
    lang: str = "auto"
):
    """
    Generate SSE stream for intelligent chat response.
    
    Yields events:
        data: {"type": "status", "value": "Analyzing..."}
        data: {"type": "intent", "value": {...}}
        data: {"type": "searching", "topics": [...]}
        data: {"type": "sources", "value": [...]}
        data: {"type": "model", "value": "llama-3.1"}
        data: {"type": "chunk", "value": "Hello"}
        data: {"type": "suggestions", "value": [...]}
        data: {"type": "done"}
    """
    try:
        # Get conversation context
        context = chat_memory.get_context_for_ai(conversation_id, max_messages=10)
        
        # Add user message to memory
        chat_memory.add_message(conversation_id, "user", message)
        
        # Track full response for memory
        full_response = ""
        detected_model = ""
        detected_sources = []
        
        # Stream from smart agent
        async for event in smart_agent.chat(
            query=message,
            conversation_id=conversation_id,
            context=context,
            stream=True,
            lang=lang
        ):
            # Forward event to client
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            
            # Track response
            if event["type"] == "chunk":
                full_response += event["value"]
            elif event["type"] == "model":
                detected_model = event["value"]
            elif event["type"] in ("sources", "final_sources"):
                detected_sources = event["value"]
        
        # Add AI response to memory
        chat_memory.add_message(
            conversation_id,
            "assistant",
            full_response,
            metadata={
                "model": detected_model,
                "sources": detected_sources
            }
        )
        
        # Generate suggestions based on conversation
        suggestions = generate_suggestions(message, full_response)
        if suggestions:
            yield f"data: {json.dumps({'type': 'suggestions', 'value': suggestions}, ensure_ascii=False)}\n\n"
        
    except Exception as e:
        import traceback
        logger.error(f"Chat stream error: {e}")
        logger.error(traceback.format_exc())
        error_msg = "Désolé, une erreur s'est produite 😅 Peux-tu reformuler ta question ?"
        yield f"data: {json.dumps({'type': 'error', 'value': error_msg})}\n\n"


def generate_suggestions(query: str, response: str) -> list:
    """Generate follow-up question suggestions."""
    # Simple rule-based suggestions for now
    suggestions = []
    
    query_lower = query.lower()
    
    # Topic-based suggestions
    if any(w in query_lower for w in ["météo", "weather", "temps"]):
        suggestions = [
            "Et demain ?",
            "Prévisions pour la semaine ?",
            "Conseils pour s'habiller ?"
        ]
    elif any(w in query_lower for w in ["bitcoin", "crypto", "eth", "btc"]):
        suggestions = [
            "Analyse du marché",
            "Autres cryptos intéressantes ?",
            "Actualités crypto"
        ]
    elif any(w in query_lower for w in ["film", "movie", "cinéma", "série"]):
        suggestions = [
            "Films similaires ?",
            "Où regarder ?",
            "Critiques ?"
        ]
    elif any(w in query_lower for w in ["restaurant", "manger", "cuisine"]):
        suggestions = [
            "Avis des clients ?",
            "Menu et prix ?",
            "Réservation ?"
        ]
    else:
        # Generic suggestions
        suggestions = [
            "Dis m'en plus",
            "Des sources ?",
            "Résume en bref"
        ]
    
    return suggestions[:3]


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/api/v6/chat")
async def chat_endpoint(
    message: str = Query(..., description="User message"),
    conversation_id: Optional[str] = Query(None, description="Conversation ID"),
    lang: str = Query("auto", description="Language (auto-detect if 'auto')")
):
    """
    💬 Smart AI Chat with streaming response.
    
    Features:
    - Multi-step reasoning
    - Automatic research when needed
    - Source attribution
    - Context-aware responses
    - Follow-up suggestions
    """
    # Generate conversation ID if not provided
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
    
    return StreamingResponse(
        chat_stream_generator(message, conversation_id, lang),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Conversation-ID": conversation_id,
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.post("/api/v6/chat")
async def chat_post_endpoint(
    message: str = Query(..., description="User message"),
    conversation_id: Optional[str] = Query(None, description="Conversation ID"),
    lang: str = Query("auto", description="Language")
):
    """
    💬 Smart AI Chat (non-streaming POST version).
    """
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
    
    # Get context
    context = chat_memory.get_context_for_ai(conversation_id, max_messages=10)
    
    # Add user message
    chat_memory.add_message(conversation_id, "user", message)
    
    # Get response
    result = await smart_agent.chat_sync(
        query=message,
        conversation_id=conversation_id,
        context=context
    )
    
    # Save to memory
    chat_memory.add_message(
        conversation_id,
        "assistant",
        result["response"],
        metadata={"model": result["model"], "sources": result["sources"]}
    )
    
    return {
        "success": True,
        "conversation_id": conversation_id,
        "response": result["response"],
        "sources": result["sources"],
        "model": result["model"],
        "suggestions": generate_suggestions(message, result["response"])
    }


@router.get("/api/v6/chat/history")
async def get_chat_history(
    conversation_id: str = Query(..., description="Conversation ID")
):
    """Get conversation history."""
    messages = chat_memory.get_messages(conversation_id)
    stats = chat_memory.get_stats(conversation_id)
    
    return {
        "success": True,
        "conversation_id": conversation_id,
        "messages": messages,
        "stats": stats
    }


@router.delete("/api/v6/chat/clear")
async def clear_chat(
    conversation_id: str = Query(..., description="Conversation ID")
):
    """Clear conversation history."""
    chat_memory.clear_conversation(conversation_id)
    
    return {
        "success": True,
        "message": "Conversation cleared"
    }


@router.get("/api/v6/chat/export")
async def export_chat(
    conversation_id: str = Query(..., description="Conversation ID"),
    format: str = Query("json", description="Export format (json or text)")
):
    """Export conversation."""
    export_data = chat_memory.export_conversation(conversation_id, format)
    
    return {
        "success": True,
        "format": format,
        "data": export_data
    }


@router.get("/api/v6/chat/test")
async def test_chat():
    """Test chat endpoint - quick health check."""
    import time
    start = time.time()
    
    try:
        result = await smart_agent.chat_sync(
            query="Test rapide: dis juste 'OK ça marche!'",
            context=[]
        )
        elapsed = time.time() - start
        
        return {
            "success": True,
            "response": result["response"][:200],
            "model": result["model"],
            "elapsed_seconds": round(elapsed, 2),
            "status": "🟢 Agent opérationnel"
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "status": "🔴 Erreur"
        }
