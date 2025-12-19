"""
💰 FINANCE INTERFACE
====================
Gère toutes les APIs financières : Crypto, Forex, Bourse.
Isolé et robuste - crash ici n'impacte pas les autres domaines.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from urllib.parse import quote
import re

from .base import BaseInterface


# Mapping des cryptos populaires vers leurs IDs CoinGecko
CRYPTO_MAP = {
    "bitcoin": "bitcoin", "btc": "bitcoin",
    "ethereum": "ethereum", "eth": "ethereum",
    "solana": "solana", "sol": "solana",
    "cardano": "cardano", "ada": "cardano",
    "ripple": "ripple", "xrp": "ripple",
    "dogecoin": "dogecoin", "doge": "dogecoin",
    "polkadot": "polkadot", "dot": "polkadot",
    "litecoin": "litecoin", "ltc": "litecoin",
    "bnb": "binancecoin", "binance": "binancecoin",
    "polygon": "matic-network", "matic": "matic-network",
    "chainlink": "chainlink", "link": "chainlink",
    "uniswap": "uniswap", "uni": "uniswap",
    "avalanche": "avalanche-2", "avax": "avalanche-2",
}


class FinanceInterface(BaseInterface):
    """
    Expert Finance : Crypto, Forex, Marchés.
    """
    
    DOMAIN_NAME = "finance"
    
    KEYWORDS = [
        # Crypto majeurs
        "bitcoin", "btc", "ethereum", "eth", "crypto", "cryptomonnaie", "cryptocurrency",
        "solana", "sol", "cardano", "ada", "dogecoin", "doge", "ripple", "xrp",
        "binance", "bnb", "polygon", "matic", "avalanche", "avax", "polkadot",
        # DeFi/NFT
        "defi", "nft", "token", "altcoin", "stablecoin", "usdt", "usdc",
        "wallet", "portefeuille", "mining", "minage", "staking",
        # Trading
        "trading", "trader", "forex", "cours", "prix", "price", "taux",
        "achat", "vente", "buy", "sell", "bullish", "bearish", "pump", "dump",
        # Bourse
        "bourse", "stock", "action", "actions", "cac40", "cac 40", "nasdaq",
        "dow jones", "s&p 500", "sp500", "nyse", "euronext",
        # Devises
        "dollar", "euro", "eur", "usd", "yen", "livre", "gbp", "chf",
        # Économie
        "marché", "market", "investir", "invest", "investissement", "investment",
        "rendement", "dividende", "capitalisation", "market cap",
        # Exchanges
        "coinbase", "kraken", "bybit", "okx", "kucoin", "ftx",
        # Analyse
        "analyse technique", "technical analysis", "prévision", "forecast", "prediction"
    ]
    
    PATTERNS = [
        r"\b(btc|eth|sol|ada|xrp|doge|dot|ltc|bnb|matic)\b",
        r"\bcours\s+(du\s+)?(bitcoin|ethereum|euro|dollar)\b",
        r"\bprix\s+(du\s+)?(bitcoin|btc|eth)\b",
        r"\bcrypto(monnaie)?s?\b",
    ]
    
    # ══════════════════════════════════════════════════════════════
    # EXTRACTION DE PARAMÈTRES
    # ══════════════════════════════════════════════════════════════
    
    def extract_params(self, query: str) -> Dict[str, Any]:
        """Extrait le symbole crypto/devise de la requête."""
        q_lower = query.lower()
        params = {"query": query}
        
        # Chercher une crypto connue
        for name, coin_id in CRYPTO_MAP.items():
            if name in q_lower:
                params["coin_id"] = coin_id
                params["coin_name"] = name
                break
        
        # Par défaut : bitcoin
        if "coin_id" not in params:
            params["coin_id"] = "bitcoin"
            params["coin_name"] = "bitcoin"
        
        return params
    
    # ══════════════════════════════════════════════════════════════
    # MODE SPEED (Ultra-rapide)
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_speed_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Speed : 1 seul appel à CoinGecko pour les prix principaux.
        Temps cible : <500ms
        """
        start = datetime.now()
        
        coin_id = params.get("coin_id", "bitcoin")
        
        # API unique : CoinGecko simple price
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id},bitcoin,ethereum&vs_currencies=usd,eur&include_24hr_change=true&include_market_cap=true"
        
        data = await self._fetch_json(url, timeout=self.SPEED_TIMEOUT)
        
        if not data:
            return self._build_response(
                success=False,
                data={},
                context="Données financières temporairement indisponibles.",
                sources=[],
                start_time=start
            )
        
        # Formater le contexte pour l'IA
        context_lines = ["📊 DONNÉES FINANCIÈRES EN TEMPS RÉEL:"]
        for coin, prices in data.items():
            if isinstance(prices, dict):
                usd = prices.get("usd", "N/A")
                eur = prices.get("eur", "N/A")
                change = prices.get("usd_24h_change", 0)
                change_symbol = "📈" if change > 0 else "📉"
                context_lines.append(
                    f"• {coin.upper()}: ${usd:,.2f} / €{eur:,.2f} {change_symbol} {change:.2f}%"
                )
        
        return self._build_response(
            success=True,
            data=data,
            context="\n".join(context_lines),
            sources=["CoinGecko"],
            start_time=start
        )
    
    # ══════════════════════════════════════════════════════════════
    # MODE DEEP (Analyse complète)
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_deep_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Deep : Multiples APIs pour analyse complète.
        - CoinGecko (prix + market cap)
        - CoinCap (données supplémentaires)
        - Binance (volume 24h)
        - Forex (taux de change)
        """
        start = datetime.now()
        
        coin_id = params.get("coin_id", "bitcoin")
        
        # Préparer les URLs
        urls = [
            # CoinGecko détaillé
            f"https://api.coingecko.com/api/v3/coins/{coin_id}?localization=false&tickers=false&community_data=false&developer_data=false",
            # CoinGecko top 10
            "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=10&sparkline=false",
            # CoinCap
            "https://api.coincap.io/v2/assets?limit=10",
            # Forex
            "https://api.exchangerate-api.com/v4/latest/EUR",
        ]
        
        # Fetch en parallèle
        results = await self._fetch_multiple(urls, timeout=self.DEEP_TIMEOUT)
        
        # Agréger les données
        aggregated = {
            "coin_detail": results[0] if results[0] else {},
            "top_coins": results[1] if results[1] else [],
            "coincap": results[2].get("data", []) if results[2] else [],
            "forex": results[3] if results[3] else {},
        }
        
        sources = []
        if results[0]: sources.append("CoinGecko Detail")
        if results[1]: sources.append("CoinGecko Markets")
        if results[2]: sources.append("CoinCap")
        if results[3]: sources.append("ExchangeRate API")
        
        # Construire contexte riche
        context_parts = ["📊 ANALYSE FINANCIÈRE COMPLÈTE:\n"]
        
        # Détail du coin demandé
        if aggregated["coin_detail"]:
            cd = aggregated["coin_detail"]
            market = cd.get("market_data", {})
            context_parts.append(f"🔷 {cd.get('name', coin_id).upper()}:")
            context_parts.append(f"   Prix: ${market.get('current_price', {}).get('usd', 'N/A'):,}")
            context_parts.append(f"   Market Cap: ${market.get('market_cap', {}).get('usd', 'N/A'):,}")
            context_parts.append(f"   Volume 24h: ${market.get('total_volume', {}).get('usd', 'N/A'):,}")
            context_parts.append(f"   Variation 24h: {market.get('price_change_percentage_24h', 'N/A')}%")
            context_parts.append(f"   ATH: ${market.get('ath', {}).get('usd', 'N/A'):,}")
        
        # Top 5 cryptos
        if aggregated["top_coins"]:
            context_parts.append("\n🏆 TOP 5 CRYPTOS PAR MARKET CAP:")
            for i, coin in enumerate(aggregated["top_coins"][:5], 1):
                context_parts.append(
                    f"   {i}. {coin.get('name')}: €{coin.get('current_price', 0):,.2f} ({coin.get('price_change_percentage_24h', 0):.2f}%)"
                )
        
        # Forex
        if aggregated["forex"]:
            rates = aggregated["forex"].get("rates", {})
            context_parts.append("\n💱 TAUX DE CHANGE (Base EUR):")
            context_parts.append(f"   EUR/USD: {rates.get('USD', 'N/A')}")
            context_parts.append(f"   EUR/GBP: {rates.get('GBP', 'N/A')}")
            context_parts.append(f"   EUR/CHF: {rates.get('CHF', 'N/A')}")
        
        return self._build_response(
            success=len(sources) > 0,
            data=aggregated,
            context="\n".join(context_parts),
            sources=sources,
            start_time=start
        )
