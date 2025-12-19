# 📈 Trading Bot NASDAQ

> Bot de trading automatisé sécurisé avec Alpaca

## ⚠️ AVERTISSEMENT IMPORTANT

**Ce bot trade de l'argent réel. Utilisez TOUJOURS le mode paper trading d'abord !**

Le trading comporte des risques de perte en capital. Ne tradez jamais avec de l'argent que vous ne pouvez pas vous permettre de perdre.

## 🛡️ Fonctionnalités de Sécurité

| Protection | Valeur par défaut |
|------------|-------------------|
| Max par position | 2% du capital |
| Stop-loss | 2% |
| Take-profit | 4% |
| Perte journalière max | 5% (arrêt automatique) |
| Perte totale max | 10% (arrêt automatique) |
| Positions simultanées | 3 max |

## 🔧 Configuration

### Variables d'environnement

```env
# Alpaca API (OBLIGATOIRE)
ALPACA_API_KEY=your_api_key
ALPACA_SECRET_KEY=your_secret_key

# Mode (paper = test, live = réel)
ALPACA_BASE_URL=https://paper-api.alpaca.markets  # PAPER
# ALPACA_BASE_URL=https://api.alpaca.markets      # LIVE (DANGER!)
```

### Obtenir les clés Alpaca

1. Créez un compte sur https://alpaca.markets
2. Allez dans "API Keys"
3. Générez une paire de clés
4. **Commencez TOUJOURS avec le mode paper**

## 🚀 Utilisation

### Mode Paper (Test)

```bash
# Configurer
export ALPACA_API_KEY=xxx
export ALPACA_SECRET_KEY=xxx
export ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Lancer
python bot.py
```

### Mode Live (Réel) - ⚠️ DANGER

```bash
# Seulement après 30+ jours de paper trading profitable
export ALPACA_BASE_URL=https://api.alpaca.markets
python bot.py
```

## 📊 Stratégies Disponibles

### 1. Momentum
```python
strategy="momentum"
```
- Achète si le prix a augmenté de +5% sur 20 jours
- Vend si le prix a baissé de -5%

### 2. RSI
```python
strategy="rsi"
```
- Achète si RSI < 30 (survendu)
- Vend si RSI > 70 (suracheté)

## 🔄 Cycle de Trading

```
┌─────────────────────────────────────────────┐
│              TRADING LOOP                    │
├─────────────────────────────────────────────┤
│                                             │
│  1. Check heures de trading (9h30-16h ET)   │
│              ↓                              │
│  2. Vérifier les règles de risque           │
│     - Perte journalière < 5%?               │
│     - Perte totale < 10%?                   │
│     - < 3 positions?                        │
│              ↓                              │
│  3. Analyser chaque symbole                 │
│     - Récupérer historique                  │
│     - Appliquer stratégie                   │
│              ↓                              │
│  4. Si signal BUY:                          │
│     - Calculer taille (max 2%)              │
│     - Placer ordre bracket                  │
│       (stop-loss + take-profit)             │
│              ↓                              │
│  5. Attendre 1 minute                       │
│              ↓                              │
│      ← Recommencer                          │
│                                             │
└─────────────────────────────────────────────┘
```

## 📁 Structure

```
trading-bot/
├── bot.py              # Bot principal
├── strategies/         # Stratégies de trading
├── requirements.txt    # Dépendances
├── Dockerfile          # Pour Fly.io
├── fly.toml            # Config Fly.io
└── README.md           # Ce fichier
```

## 🚁 Déploiement Fly.io

```bash
cd packages/trading-bot

# Créer l'app
flyctl launch --name trading-bot-safe

# Configurer les secrets
flyctl secrets set ALPACA_API_KEY=xxx
flyctl secrets set ALPACA_SECRET_KEY=xxx
flyctl secrets set ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Déployer
flyctl deploy
```

## 📈 Symboles Tradés

| Symbole | Nom |
|---------|-----|
| AAPL | Apple |
| MSFT | Microsoft |
| GOOGL | Alphabet |
| AMZN | Amazon |
| NVDA | NVIDIA |
| META | Meta |
| TSLA | Tesla |
| AMD | AMD |
| NFLX | Netflix |
| CRM | Salesforce |

## 📊 Monitoring

```bash
# Logs en temps réel
flyctl logs -a trading-bot-safe

# Status
flyctl status -a trading-bot-safe

# Arrêter le bot
flyctl scale count 0 -a trading-bot-safe
```

## 🚨 Arrêt d'Urgence

```bash
# Arrêter immédiatement
flyctl scale count 0 -a trading-bot-safe --yes

# Fermer toutes les positions via Alpaca
# Connectez-vous à https://app.alpaca.markets
# Cliquez sur "Close All Positions"
```

## 📝 Logs

Les logs sont structurés ainsi :

```
2025-12-19 12:00:00 [INFO] 📈 TRADING BOT STARTED
2025-12-19 12:00:00 [INFO]    Mode: PAPER
2025-12-19 12:00:01 [INFO] 💰 Capital initial: $100,000.00
2025-12-19 12:01:00 [INFO] 📗 BUY AAPL: 10 shares @ $195.50
2025-12-19 12:01:00 [INFO]    Stop-loss: $191.59 | Take-profit: $203.32
2025-12-19 12:01:01 [INFO] ✅ Order placed: xxx-xxx-xxx
```

## ⚙️ Configuration Avancée

```python
config = TradingConfig(
    # Risk Management
    max_position_pct=0.02,      # 2% max par position
    max_daily_loss_pct=0.05,    # Arrêt si -5% journalier
    max_total_loss_pct=0.10,    # Arrêt si -10% total
    max_positions=3,            # 3 positions max
    stop_loss_pct=0.02,         # Stop-loss 2%
    take_profit_pct=0.04,       # Take-profit 4%
    
    # Trading
    strategy="momentum",        # ou "rsi"
    paper_trading=True,         # TOUJOURS True pour commencer
    
    # Symbols
    symbols=["AAPL", "MSFT", "GOOGL", ...]
)
```

---

**🔴 RAPPEL: Mode Paper trading obligatoire pendant minimum 30 jours avant de passer en live !**
