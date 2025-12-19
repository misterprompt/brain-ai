# -*- coding: utf-8 -*-
"""
🎲 GURUGAMMON - API Web pour Monitoring
========================================
API FastAPI pour surveiller le système autonome.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime
from pathlib import Path

app = FastAPI(
    title="🎲 GuruGammon AI Monitor",
    description="Monitoring du système autonome de Backgammon",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GameResult(BaseModel):
    game_id: str
    winner: str
    total_moves: int
    duration_seconds: float
    white_pieces_off: int
    black_pieces_off: int
    is_gammon: bool
    is_backgammon: bool
    timestamp: str


class SystemStats(BaseModel):
    total_games: int
    white_wins: int
    black_wins: int
    draws: int
    total_moves: int
    avg_moves_per_game: float
    avg_game_duration: float
    gammons: int
    backgammons: int
    uptime_hours: float


# Fichiers de données
RESULTS_FILE = Path(__file__).parent / "game_results.json"
LOG_FILE = Path(__file__).parent / "gurugammon_autonomous.log"


def load_results() -> List[dict]:
    """Charge les résultats depuis le fichier JSON."""
    if RESULTS_FILE.exists():
        try:
            with open(RESULTS_FILE) as f:
                return json.load(f)
        except:
            return []
    return []


@app.get("/")
async def root():
    """Page d'accueil avec dashboard."""
    results = load_results()
    stats = calculate_stats(results)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎲 GuruGammon AI Monitor</title>
        <meta http-equiv="refresh" content="30">
        <style>
            body {{
                font-family: 'Segoe UI', Arial, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white;
                margin: 0;
                padding: 20px;
                min-height: 100vh;
            }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            h1 {{ 
                text-align: center; 
                font-size: 2.5em;
                background: linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}
            .stats-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }}
            .stat-card {{
                background: rgba(255,255,255,0.1);
                border-radius: 15px;
                padding: 20px;
                text-align: center;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
            }}
            .stat-value {{
                font-size: 2.5em;
                font-weight: bold;
                color: #48dbfb;
            }}
            .stat-label {{
                color: #ccc;
                margin-top: 10px;
            }}
            .win-bar {{
                height: 30px;
                background: #333;
                border-radius: 15px;
                overflow: hidden;
                margin: 20px 0;
            }}
            .win-white {{
                height: 100%;
                background: linear-gradient(90deg, #fff, #ddd);
                float: left;
            }}
            .win-black {{
                height: 100%;
                background: linear-gradient(90deg, #333, #111);
                float: left;
            }}
            .recent-games {{
                background: rgba(255,255,255,0.05);
                border-radius: 15px;
                padding: 20px;
                margin-top: 30px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
            }}
            th, td {{
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }}
            th {{ color: #48dbfb; }}
            .status {{
                display: inline-block;
                padding: 5px 15px;
                border-radius: 20px;
                font-weight: bold;
            }}
            .status-running {{
                background: #2ecc71;
                color: white;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎲 GuruGammon AI Monitor</h1>
            
            <div style="text-align: center; margin: 20px 0;">
                <span class="status status-running">🟢 SYSTÈME AUTONOME EN COURS</span>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">{stats['total_games']}</div>
                    <div class="stat-label">Parties jouées</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{stats['total_moves']}</div>
                    <div class="stat-label">Coups joués</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{stats['avg_moves_per_game']:.1f}</div>
                    <div class="stat-label">Coups / partie</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{stats['uptime_hours']:.1f}h</div>
                    <div class="stat-label">Temps écoulé</div>
                </div>
            </div>
            
            <h2>Victoires</h2>
            <div class="win-bar">
                <div class="win-white" style="width: {100*stats['white_wins']/max(1,stats['total_games']):.1f}%"></div>
                <div class="win-black" style="width: {100*stats['black_wins']/max(1,stats['total_games']):.1f}%"></div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>⚪ Blanc: {stats['white_wins']} ({100*stats['white_wins']/max(1,stats['total_games']):.1f}%)</span>
                <span>⚫ Noir: {stats['black_wins']} ({100*stats['black_wins']/max(1,stats['total_games']):.1f}%)</span>
            </div>
            
            <div class="stats-grid" style="margin-top: 30px;">
                <div class="stat-card">
                    <div class="stat-value" style="color: #feca57;">{stats['gammons']}</div>
                    <div class="stat-label">Gammons</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #ff6b6b;">{stats['backgammons']}</div>
                    <div class="stat-label">Backgammons</div>
                </div>
            </div>
            
            <div class="recent-games">
                <h2>🕒 Parties Récentes</h2>
                <table>
                    <tr>
                        <th>ID</th>
                        <th>Gagnant</th>
                        <th>Coups</th>
                        <th>Durée</th>
                        <th>Type</th>
                    </tr>
                    {''.join(f'''
                    <tr>
                        <td>{r.get('game_id', 'N/A')[:15]}...</td>
                        <td>{'⚪' if r.get('winner') == 'white' else '⚫'} {r.get('winner', 'N/A')}</td>
                        <td>{r.get('total_moves', 0)}</td>
                        <td>{r.get('duration_seconds', 0):.1f}s</td>
                        <td>{'🏆 Backgammon' if r.get('is_backgammon') else '🎯 Gammon' if r.get('is_gammon') else 'Normal'}</td>
                    </tr>
                    ''' for r in results[-10:][::-1])}
                </table>
            </div>
            
            <p style="text-align: center; color: #666; margin-top: 30px;">
                Auto-refresh toutes les 30 secondes | 
                <a href="/api/stats" style="color: #48dbfb;">API JSON</a>
            </p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


def calculate_stats(results: List[dict]) -> dict:
    """Calcule les statistiques."""
    if not results:
        return {
            "total_games": 0,
            "white_wins": 0,
            "black_wins": 0,
            "draws": 0,
            "total_moves": 0,
            "avg_moves_per_game": 0,
            "avg_game_duration": 0,
            "gammons": 0,
            "backgammons": 0,
            "uptime_hours": 0,
        }
    
    total_games = len(results)
    white_wins = sum(1 for r in results if r.get('winner') == 'white')
    black_wins = sum(1 for r in results if r.get('winner') == 'black')
    total_moves = sum(r.get('total_moves', 0) for r in results)
    total_duration = sum(r.get('duration_seconds', 0) for r in results)
    gammons = sum(1 for r in results if r.get('is_gammon'))
    backgammons = sum(1 for r in results if r.get('is_backgammon'))
    
    # Calculer uptime
    if results:
        try:
            first_game = datetime.fromisoformat(results[0].get('timestamp', datetime.now().isoformat()))
            uptime = (datetime.now() - first_game).total_seconds() / 3600
        except:
            uptime = total_duration / 3600
    else:
        uptime = 0
    
    return {
        "total_games": total_games,
        "white_wins": white_wins,
        "black_wins": black_wins,
        "draws": total_games - white_wins - black_wins,
        "total_moves": total_moves,
        "avg_moves_per_game": total_moves / max(1, total_games),
        "avg_game_duration": total_duration / max(1, total_games),
        "gammons": gammons,
        "backgammons": backgammons,
        "uptime_hours": uptime,
    }


@app.get("/api/stats", response_model=SystemStats)
async def get_stats():
    """Retourne les statistiques du système."""
    results = load_results()
    stats = calculate_stats(results)
    return SystemStats(**stats)


@app.get("/api/games", response_model=List[GameResult])
async def get_games(limit: int = 100, offset: int = 0):
    """Retourne les dernières parties."""
    results = load_results()
    return [GameResult(**r) for r in results[offset:offset+limit]]


@app.get("/api/health")
async def health():
    """Health check."""
    return {"status": "ok", "service": "gammon-ai-monitor"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
