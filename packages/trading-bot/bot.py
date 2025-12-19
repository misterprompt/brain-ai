# -*- coding: utf-8 -*-
"""
📈 TRADING BOT NASDAQ - Version Sécurisée
==========================================
Bot de trading automatisé avec gestion du risque.

⚠️ IMPORTANT: Ce bot trade de l'argent réel. Utilisez en mode paper d'abord!
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum
import httpx
from threading import Thread
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

# Configuration logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-7s | %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("TradingBot")


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK SERVER (pour Fly.io)
# ═══════════════════════════════════════════════════════════════════════════════

class HealthHandler(BaseHTTPRequestHandler):
    """Handler pour le health check."""
    
    def do_GET(self):
        if self.path == '/health' or self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            status = {
                "status": "healthy",
                "bot": "trading-bot-nasdaq",
                "mode": "paper" if "paper" in os.getenv("ALPACA_BASE_URL", "") else "live",
                "timestamp": datetime.utcnow().isoformat()
            }
            self.wfile.write(json.dumps(status).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Silence les logs HTTP


def start_health_server():
    """Démarre le serveur de health check."""
    port = int(os.getenv("PORT", 8080))
    server = HTTPServer(('0.0.0.0', port), HealthHandler)
    logger.info(f"🏥 Health server running on port {port}")
    server.serve_forever()


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TradingConfig:
    """Configuration du bot de trading."""
    
    # Alpaca API (from environment)
    alpaca_api_key: str = field(default_factory=lambda: os.getenv("ALPACA_API_KEY", ""))
    alpaca_secret: str = field(default_factory=lambda: os.getenv("ALPACA_SECRET_KEY", ""))
    alpaca_base_url: str = field(default_factory=lambda: os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets"))
    
    # Risk Management - CRITICAL
    max_position_pct: float = 0.02      # Max 2% du capital par position
    max_daily_loss_pct: float = 0.05    # Arrêt si perte > 5% journalière
    max_total_loss_pct: float = 0.10    # Arrêt si perte > 10% totale
    max_positions: int = 3              # Max 3 positions simultanées
    stop_loss_pct: float = 0.02         # Stop-loss à 2%
    take_profit_pct: float = 0.04       # Take-profit à 4%
    
    # Trading hours
    trading_start_hour: int = 14        # 14h UTC = 9h30 ET
    trading_end_hour: int = 20          # 20h UTC = 16h ET
    
    # Symbols to trade
    symbols: List[str] = field(default_factory=lambda: [
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", 
        "META", "TSLA", "AMD", "NFLX", "CRM"
    ])
    
    # Strategy
    strategy: str = "momentum"  # momentum, mean_reversion, rsi
    
    # Mode
    paper_trading: bool = True  # ALWAYS START WITH PAPER!
    
    def validate(self) -> bool:
        """Valide la configuration."""
        if not self.alpaca_api_key or not self.alpaca_secret:
            logger.error("❌ Alpaca API keys not configured!")
            return False
        if not self.paper_trading and "paper" not in self.alpaca_base_url:
            logger.warning("⚠️ LIVE TRADING MODE - Use with caution!")
        return True


# ═══════════════════════════════════════════════════════════════════════════════
# ALPACA CLIENT
# ═══════════════════════════════════════════════════════════════════════════════

class AlpacaClient:
    """Client pour l'API Alpaca."""
    
    def __init__(self, config: TradingConfig):
        self.config = config
        self.client = httpx.AsyncClient(timeout=30)
        self.headers = {
            "APCA-API-KEY-ID": config.alpaca_api_key,
            "APCA-API-SECRET-KEY": config.alpaca_secret,
        }
        self.base_url = config.alpaca_base_url
        self.data_url = "https://data.alpaca.markets"
    
    async def get_account(self) -> Dict:
        """Récupère les infos du compte."""
        response = await self.client.get(
            f"{self.base_url}/v2/account",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    async def get_positions(self) -> List[Dict]:
        """Récupère les positions ouvertes."""
        response = await self.client.get(
            f"{self.base_url}/v2/positions",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    async def get_quote(self, symbol: str) -> Dict:
        """Récupère le prix actuel."""
        response = await self.client.get(
            f"{self.data_url}/v2/stocks/{symbol}/quotes/latest",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    async def get_bars(self, symbol: str, timeframe: str = "1Day", limit: int = 50) -> List[Dict]:
        """Récupère l'historique des prix."""
        response = await self.client.get(
            f"{self.data_url}/v2/stocks/{symbol}/bars",
            headers=self.headers,
            params={"timeframe": timeframe, "limit": limit}
        )
        response.raise_for_status()
        return response.json().get("bars", [])
    
    async def place_order(
        self,
        symbol: str,
        qty: int,
        side: str,  # "buy" or "sell"
        order_type: str = "market",
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> Dict:
        """Place un ordre avec stop-loss et take-profit."""
        order_data = {
            "symbol": symbol,
            "qty": qty,
            "side": side,
            "type": order_type,
            "time_in_force": "day"
        }
        
        # Ajouter bracket order si stop-loss/take-profit
        if stop_loss and take_profit and side == "buy":
            order_data["order_class"] = "bracket"
            order_data["stop_loss"] = {"stop_price": stop_loss}
            order_data["take_profit"] = {"limit_price": take_profit}
        
        response = await self.client.post(
            f"{self.base_url}/v2/orders",
            headers=self.headers,
            json=order_data
        )
        response.raise_for_status()
        return response.json()
    
    async def close_position(self, symbol: str) -> Dict:
        """Ferme une position."""
        response = await self.client.delete(
            f"{self.base_url}/v2/positions/{symbol}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    async def close(self):
        await self.client.aclose()


# ═══════════════════════════════════════════════════════════════════════════════
# RISK MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class RiskManager:
    """Gestionnaire de risque - Le plus important!"""
    
    def __init__(self, config: TradingConfig):
        self.config = config
        self.initial_equity: float = 0
        self.daily_start_equity: float = 0
        self.trading_halted: bool = False
        self.halt_reason: str = ""
    
    async def initialize(self, client: AlpacaClient):
        """Initialise avec le capital actuel."""
        account = await client.get_account()
        self.initial_equity = float(account["equity"])
        self.daily_start_equity = self.initial_equity
        logger.info(f"💰 Capital initial: ${self.initial_equity:,.2f}")
    
    async def check_can_trade(self, client: AlpacaClient) -> bool:
        """Vérifie si on peut trader (risk checks)."""
        if self.trading_halted:
            logger.warning(f"🛑 Trading halté: {self.halt_reason}")
            return False
        
        account = await client.get_account()
        current_equity = float(account["equity"])
        
        # Check perte journalière
        daily_loss = (self.daily_start_equity - current_equity) / self.daily_start_equity
        if daily_loss > self.config.max_daily_loss_pct:
            self.trading_halted = True
            self.halt_reason = f"Perte journalière > {self.config.max_daily_loss_pct*100}%"
            logger.error(f"🛑 {self.halt_reason}")
            return False
        
        # Check perte totale
        total_loss = (self.initial_equity - current_equity) / self.initial_equity
        if total_loss > self.config.max_total_loss_pct:
            self.trading_halted = True
            self.halt_reason = f"Perte totale > {self.config.max_total_loss_pct*100}%"
            logger.error(f"🛑 {self.halt_reason}")
            return False
        
        # Check nombre de positions
        positions = await client.get_positions()
        if len(positions) >= self.config.max_positions:
            logger.info(f"⏸️ Max positions atteint ({self.config.max_positions})")
            return False
        
        return True
    
    def calculate_position_size(self, equity: float, price: float) -> int:
        """Calcule la taille de position selon le risk management."""
        max_position_value = equity * self.config.max_position_pct
        qty = int(max_position_value / price)
        return max(1, qty)  # Au moins 1 action
    
    def calculate_stop_loss(self, entry_price: float, side: str) -> float:
        """Calcule le stop-loss."""
        if side == "buy":
            return entry_price * (1 - self.config.stop_loss_pct)
        else:
            return entry_price * (1 + self.config.stop_loss_pct)
    
    def calculate_take_profit(self, entry_price: float, side: str) -> float:
        """Calcule le take-profit."""
        if side == "buy":
            return entry_price * (1 + self.config.take_profit_pct)
        else:
            return entry_price * (1 - self.config.take_profit_pct)


# ═══════════════════════════════════════════════════════════════════════════════
# STRATEGIES
# ═══════════════════════════════════════════════════════════════════════════════

class TradingSignal(Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


class MomentumStrategy:
    """Stratégie momentum simple."""
    
    def __init__(self, lookback: int = 20):
        self.lookback = lookback
    
    def analyze(self, bars: List[Dict]) -> TradingSignal:
        """Analyse les bars et retourne un signal."""
        if len(bars) < self.lookback:
            return TradingSignal.HOLD
        
        # Calculer le momentum
        closes = [float(bar["c"]) for bar in bars[-self.lookback:]]
        current = closes[-1]
        past = closes[0]
        
        momentum = (current - past) / past
        
        # Signaux
        if momentum > 0.05:  # +5% sur la période
            return TradingSignal.BUY
        elif momentum < -0.05:  # -5% sur la période
            return TradingSignal.SELL
        return TradingSignal.HOLD


class RSIStrategy:
    """Stratégie RSI."""
    
    def __init__(self, period: int = 14, oversold: int = 30, overbought: int = 70):
        self.period = period
        self.oversold = oversold
        self.overbought = overbought
    
    def calculate_rsi(self, closes: List[float]) -> float:
        """Calcule le RSI."""
        if len(closes) < self.period + 1:
            return 50
        
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [d if d > 0 else 0 for d in deltas[-self.period:]]
        losses = [-d if d < 0 else 0 for d in deltas[-self.period:]]
        
        avg_gain = sum(gains) / self.period
        avg_loss = sum(losses) / self.period
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))
    
    def analyze(self, bars: List[Dict]) -> TradingSignal:
        """Analyse avec RSI."""
        closes = [float(bar["c"]) for bar in bars]
        rsi = self.calculate_rsi(closes)
        
        if rsi < self.oversold:
            return TradingSignal.BUY
        elif rsi > self.overbought:
            return TradingSignal.SELL
        return TradingSignal.HOLD


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN BOT
# ═══════════════════════════════════════════════════════════════════════════════

class TradingBot:
    """Bot de trading principal."""
    
    def __init__(self, config: TradingConfig):
        self.config = config
        self.client = AlpacaClient(config)
        self.risk_manager = RiskManager(config)
        
        # Sélection de la stratégie
        if config.strategy == "momentum":
            self.strategy = MomentumStrategy()
        elif config.strategy == "rsi":
            self.strategy = RSIStrategy()
        else:
            self.strategy = MomentumStrategy()
        
        self.running = False
    
    async def start(self):
        """Démarre le bot."""
        if not self.config.validate():
            return
        
        await self.risk_manager.initialize(self.client)
        
        logger.info("=" * 60)
        logger.info("📈 TRADING BOT STARTED")
        logger.info(f"   Mode: {'PAPER' if self.config.paper_trading else 'LIVE'}")
        logger.info(f"   Strategy: {self.config.strategy}")
        logger.info(f"   Symbols: {len(self.config.symbols)}")
        logger.info(f"   Max position: {self.config.max_position_pct*100}%")
        logger.info(f"   Stop-loss: {self.config.stop_loss_pct*100}%")
        logger.info("=" * 60)
        
        self.running = True
        
        try:
            while self.running:
                await self.trading_loop()
                await asyncio.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            logger.info("🛑 Bot stopped by user")
        finally:
            await self.client.close()
    
    async def trading_loop(self):
        """Boucle de trading principale."""
        # Check trading hours
        now = datetime.utcnow()
        if not (self.config.trading_start_hour <= now.hour < self.config.trading_end_hour):
            return
        
        # Check if we can trade
        if not await self.risk_manager.check_can_trade(self.client):
            return
        
        # Get account info
        account = await self.client.get_account()
        equity = float(account["equity"])
        
        # Analyze each symbol
        for symbol in self.config.symbols:
            try:
                await self.analyze_and_trade(symbol, equity)
            except Exception as e:
                logger.error(f"❌ Error trading {symbol}: {e}")
    
    async def analyze_and_trade(self, symbol: str, equity: float):
        """Analyse un symbol et trade si signal."""
        # Get historical data
        bars = await self.client.get_bars(symbol)
        if not bars:
            return
        
        # Get signal
        signal = self.strategy.analyze(bars)
        
        if signal == TradingSignal.HOLD:
            return
        
        # Check if already have position
        positions = await self.client.get_positions()
        has_position = any(p["symbol"] == symbol for p in positions)
        
        if signal == TradingSignal.BUY and not has_position:
            await self.execute_buy(symbol, equity, bars)
        elif signal == TradingSignal.SELL and has_position:
            await self.execute_sell(symbol)
    
    async def execute_buy(self, symbol: str, equity: float, bars: List[Dict]):
        """Exécute un achat."""
        current_price = float(bars[-1]["c"])
        
        # Calculate position size
        qty = self.risk_manager.calculate_position_size(equity, current_price)
        
        # Calculate stop-loss and take-profit
        stop_loss = self.risk_manager.calculate_stop_loss(current_price, "buy")
        take_profit = self.risk_manager.calculate_take_profit(current_price, "buy")
        
        logger.info(f"📗 BUY {symbol}: {qty} shares @ ${current_price:.2f}")
        logger.info(f"   Stop-loss: ${stop_loss:.2f} | Take-profit: ${take_profit:.2f}")
        
        # Place order
        try:
            order = await self.client.place_order(
                symbol=symbol,
                qty=qty,
                side="buy",
                stop_loss=stop_loss,
                take_profit=take_profit
            )
            logger.info(f"✅ Order placed: {order['id']}")
        except Exception as e:
            logger.error(f"❌ Failed to place order: {e}")
    
    async def execute_sell(self, symbol: str):
        """Ferme une position."""
        logger.info(f"📕 SELL {symbol}: Closing position")
        
        try:
            await self.client.close_position(symbol)
            logger.info(f"✅ Position closed")
        except Exception as e:
            logger.error(f"❌ Failed to close position: {e}")
    
    def stop(self):
        """Arrête le bot."""
        self.running = False


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

async def main():
    """Point d'entrée."""
    # Démarrer le serveur health check en arrière-plan
    health_thread = Thread(target=start_health_server, daemon=True)
    health_thread.start()
    
    config = TradingConfig(
        paper_trading=True,  # TOUJOURS commencer en paper!
        strategy="momentum",
        max_position_pct=0.02,
        max_daily_loss_pct=0.05,
        max_total_loss_pct=0.10,
        stop_loss_pct=0.02,
        take_profit_pct=0.04,
    )
    
    bot = TradingBot(config)
    await bot.start()


if __name__ == "__main__":
    asyncio.run(main())
