#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🧠 THE BRAIN - Installation Script
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "🧠 Installing The Brain..."

# Check Python
python3 --version || { echo "❌ Python 3 required"; exit 1; }

# Create venv
python3 -m venv venv
source venv/bin/activate

# Install deps
pip install --upgrade pip
pip install -r packages/api-server/requirements.txt

# Setup env
if [ ! -f .env ]; then
    cp configs/.env.example .env
    echo "📝 Created .env file - please configure your API keys"
fi

echo "✅ Installation complete!"
echo ""
echo "🚀 To start:"
echo "   source venv/bin/activate"
echo "   cd packages/api-server"
echo "   uvicorn src.main:app --reload"
