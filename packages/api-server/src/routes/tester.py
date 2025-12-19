"""
🧪 TESTER ENDPOINT - API de Monitoring du Chat
===============================================
Endpoints pour:
- Lancer des tests manuels
- Voir les rapports
- Consulter les statistiques
- Gérer le monitoring automatique
"""

import asyncio
from fastapi import APIRouter, BackgroundTasks, Query
from typing import Optional
from datetime import datetime

from services.chat_tester import chat_tester

router = APIRouter(prefix="/api/tester", tags=["Chat Tester"])


@router.get("/run")
async def run_test():
    """
    🧪 Lance un test complet du chat et retourne le rapport.
    
    Temps estimé: 30-60 secondes
    """
    report = await chat_tester.run_full_test()
    
    return {
        "success": True,
        "message": "Test completed",
        "report": {
            "id": report.report_id,
            "timestamp": report.timestamp,
            "status": report.overall_status,
            "score": report.overall_score,
            "tests_passed": report.tests_passed,
            "tests_failed": report.tests_failed,
            "tests_warning": report.tests_warning,
            "duration_seconds": report.duration_seconds,
            "ai_analysis": report.ai_analysis,
            "recommendations": report.recommendations,
            "details": report.test_results
        }
    }


@router.get("/latest")
async def get_latest_report():
    """
    📋 Retourne le dernier rapport de test.
    """
    report = chat_tester.get_latest_report()
    
    if not report:
        return {
            "success": False,
            "message": "No tests have been run yet. Use /api/tester/run to start."
        }
    
    return {
        "success": True,
        "report": {
            "id": report.report_id,
            "timestamp": report.timestamp,
            "status": report.overall_status,
            "score": report.overall_score,
            "tests_passed": report.tests_passed,
            "tests_failed": report.tests_failed,
            "tests_warning": report.tests_warning,
            "duration_seconds": report.duration_seconds,
            "ai_analysis": report.ai_analysis,
            "recommendations": report.recommendations,
            "details": report.test_results
        }
    }


@router.get("/history")
async def get_test_history(
    limit: int = Query(10, ge=1, le=100, description="Nombre de rapports à retourner")
):
    """
    📊 Retourne l'historique des rapports de test.
    """
    reports = chat_tester.get_all_reports(limit)
    
    return {
        "success": True,
        "count": len(reports),
        "reports": [
            {
                "id": r.report_id,
                "timestamp": r.timestamp,
                "status": r.overall_status,
                "score": r.overall_score,
                "tests_passed": r.tests_passed,
                "tests_failed": r.tests_failed
            }
            for r in reversed(reports)  # Plus récent en premier
        ]
    }


@router.get("/stats")
async def get_tester_stats():
    """
    📈 Statistiques globales du tester.
    """
    stats = chat_tester.get_stats()
    
    return {
        "success": True,
        "stats": stats
    }


@router.post("/start-background")
async def start_background_testing(background_tasks: BackgroundTasks):
    """
    🔄 Démarre les tests automatiques en arrière-plan (toutes les 30 min).
    """
    if chat_tester.is_running:
        return {
            "success": False,
            "message": "Background testing is already running"
        }
    
    background_tasks.add_task(chat_tester.start_background_testing)
    
    return {
        "success": True,
        "message": "Background testing started (every 30 minutes)",
        "next_test": (datetime.now()).isoformat()
    }


@router.post("/stop-background")
async def stop_background_testing():
    """
    ⏹️ Arrête les tests automatiques.
    """
    chat_tester.stop_background_testing()
    
    return {
        "success": True,
        "message": "Background testing stopped"
    }


@router.get("/status")
async def get_tester_status():
    """
    ℹ️ Statut actuel du tester.
    """
    return {
        "success": True,
        "is_running": chat_tester.is_running,
        "last_test": chat_tester.last_test_time.isoformat() if chat_tester.last_test_time else None,
        "reports_stored": len(chat_tester.reports),
        "stats": chat_tester.get_stats()
    }


@router.get("/quick-check")
async def quick_health_check():
    """
    ⚡ Check rapide - teste juste une question simple.
    """
    from services.chat_tester import ChatTester
    
    tester = ChatTester()
    result = await tester._call_chat_api("Dis simplement 'OK' si tu fonctionnes.")
    
    if result.get("success"):
        response = result.get("response", "")
        is_ok = "ok" in response.lower() or len(response) > 5
        
        return {
            "success": True,
            "status": "✅ Chat is working" if is_ok else "⚠️ Chat responded but unexpected",
            "response_preview": response[:100],
            "response_time_ms": round(result.get("elapsed_ms", 0), 0),
            "model": result.get("model", "unknown")
        }
    else:
        return {
            "success": False,
            "status": "❌ Chat is not responding",
            "error": result.get("error", "Unknown error"),
            "response_time_ms": round(result.get("elapsed_ms", 0), 0)
        }
