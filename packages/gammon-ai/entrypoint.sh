#!/bin/bash

# Démarrer l'API en arrière-plan
echo "🚀 Starting GuruGammon API..."
python -m bot.api &

# Attendre que l'API soit prête (optionnel mais recommandé)
sleep 2

# Démarrer le système autonome au premier plan
echo "🤖 Starting Autonomous System..."
python -m bot.autonomous_system
