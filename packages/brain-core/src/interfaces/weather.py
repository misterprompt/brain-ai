"""
🌤️ WEATHER INTERFACE
=====================
Gère toutes les APIs météo : OpenMeteo, Wttr.in, Air Quality.
Isolé et robuste.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import re

from .base import BaseInterface


# Coordonnées des villes principales
CITY_COORDS = {
    # France
    "paris": (48.85, 2.35), "lyon": (45.76, 4.84), "marseille": (43.30, 5.37),
    "nice": (43.71, 7.26), "toulouse": (43.60, 1.44), "bordeaux": (44.84, -0.58),
    "nantes": (47.22, -1.55), "strasbourg": (48.58, 7.75), "lille": (50.63, 3.06),
    "montpellier": (43.61, 3.88), "cannes": (43.55, 7.01), "monaco": (43.73, 7.42),
    
    # Europe
    "london": (51.51, -0.13), "berlin": (52.52, 13.41), "rome": (41.90, 12.50),
    "madrid": (40.42, -3.70), "barcelona": (41.39, 2.17), "amsterdam": (52.37, 4.90),
    "vienna": (48.21, 16.37), "prague": (50.08, 14.44), "lisbon": (38.72, -9.14),
    "dublin": (53.35, -6.26), "brussels": (50.85, 4.35), "zurich": (47.37, 8.54),
    
    # Monde
    "new york": (40.71, -74.01), "los angeles": (34.05, -118.24),
    "tokyo": (35.68, 139.69), "dubai": (25.20, 55.27), "singapore": (1.35, 103.82),
    "sydney": (-33.87, 151.21), "toronto": (43.65, -79.38),
    "tel aviv": (32.08, 34.78), "bangkok": (13.76, 100.50),
}


class WeatherInterface(BaseInterface):
    """
    Expert Météo : Prévisions, Qualité de l'air.
    """
    
    DOMAIN_NAME = "weather"
    
    KEYWORDS = [
        "météo", "meteo", "weather", "temps", "température", "temperature",
        "pluie", "rain", "soleil", "sun", "neige", "snow", "vent", "wind",
        "prévisions", "forecast", "humidité", "humidity", "orage", "storm"
    ]
    
    PATTERNS = [
        r"\b(météo|meteo|weather)\s+(à|a|in|de)?\s*\w+\b",
        r"\bquel\s+temps\s+(fait|à|a)\b",
        r"\b(température|temperature)\s+(à|a|in)?\s*\w+\b",
        r"\bprevisions?\s+(météo|meteo)?\b",
    ]
    
    # ══════════════════════════════════════════════════════════════
    # EXTRACTION DE PARAMÈTRES
    # ══════════════════════════════════════════════════════════════
    
    def extract_params(self, query: str) -> Dict[str, Any]:
        """Extrait la ville et ses coordonnées."""
        q_lower = query.lower()
        params = {"query": query}
        
        # Chercher une ville connue
        for city, coords in CITY_COORDS.items():
            if city in q_lower:
                params["city"] = city
                params["lat"] = coords[0]
                params["lon"] = coords[1]
                break
        
        # Fallback : essayer d'extraire le dernier mot comme ville
        if "city" not in params:
            words = query.split()
            if words:
                potential_city = words[-1].lower()
                if potential_city in CITY_COORDS:
                    coords = CITY_COORDS[potential_city]
                    params["city"] = potential_city
                    params["lat"] = coords[0]
                    params["lon"] = coords[1]
                else:
                    # Ville inconnue, on la garde quand même pour wttr.in
                    params["city"] = potential_city
        
        return params
    
    # ══════════════════════════════════════════════════════════════
    # MODE SPEED
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_speed_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Speed : Open-Meteo (API fiable et rapide).
        """
        start = datetime.now()
        
        city = params.get("city", "Paris")
        lat = params.get("lat", 48.85)
        lon = params.get("lon", 2.35)
        
        # Open-Meteo : API fiable et rapide
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto"
        
        data = await self._fetch_json(url, timeout=self.SPEED_TIMEOUT)
        
        if not data or "current" not in data:
            return self._build_response(
                success=False,
                data={},
                context=f"Données météo indisponibles pour {city}.",
                sources=[],
                start_time=start
            )
        
        # Parser les données
        current = data["current"]
        
        temp = current.get("temperature_2m", "?")
        feels_like = current.get("apparent_temperature", temp)
        humidity = current.get("relative_humidity_2m", "?")
        wind = current.get("wind_speed_10m", "?")
        weather_code = current.get("weather_code", 0)
        
        # Traduire le code météo
        weather_desc = self._get_weather_description(weather_code)
        
        context = f"""🌤️ MÉTÉO {city.upper()} (Temps réel):
• Température: {temp}°C (ressenti {feels_like}°C)
• Conditions: {weather_desc}
• Humidité: {humidity}%
• Vent: {wind} km/h"""
        
        return self._build_response(
            success=True,
            data=data,
            context=context,
            sources=["Open-Meteo"],
            start_time=start
        )
    
    def _get_weather_description(self, code: int) -> str:
        """Convertit le code météo WMO en description."""
        codes = {
            0: "Ciel dégagé ☀️",
            1: "Principalement dégagé 🌤️",
            2: "Partiellement nuageux ⛅",
            3: "Couvert ☁️",
            45: "Brouillard 🌫️",
            48: "Brouillard givrant 🌫️",
            51: "Bruine légère 🌧️",
            53: "Bruine modérée 🌧️",
            55: "Bruine dense 🌧️",
            61: "Pluie légère 🌧️",
            63: "Pluie modérée 🌧️",
            65: "Pluie forte 🌧️",
            71: "Neige légère ❄️",
            73: "Neige modérée ❄️",
            75: "Neige forte ❄️",
            77: "Grains de neige ❄️",
            80: "Averses légères 🌦️",
            81: "Averses modérées 🌦️",
            82: "Averses violentes 🌦️",
            85: "Neige faible 🌨️",
            86: "Neige forte 🌨️",
            95: "Orage ⛈️",
            96: "Orage avec grêle légère ⛈️",
            99: "Orage avec grêle forte ⛈️",
        }
        return codes.get(code, "Variable")
    
    # ══════════════════════════════════════════════════════════════
    # MODE DEEP
    # ══════════════════════════════════════════════════════════════
    
    async def fetch_deep_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mode Deep : OpenMeteo (prévisions) + Wttr.in + Air Quality.
        """
        start = datetime.now()
        
        city = params.get("city", "Paris")
        lat = params.get("lat", 48.85)
        lon = params.get("lon", 2.35)
        
        urls = [
            # OpenMeteo : prévisions détaillées
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto",
            # Wttr.in : données actuelles
            f"https://wttr.in/{city}?format=j1",
            # Air Quality
            f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=european_aqi,pm10,pm2_5",
        ]
        
        results = await self._fetch_multiple(urls, timeout=self.DEEP_TIMEOUT)
        
        sources = []
        aggregated = {}
        
        # OpenMeteo
        if results[0]:
            sources.append("OpenMeteo")
            aggregated["forecast"] = results[0]
        
        # Wttr.in
        if results[1]:
            sources.append("Wttr.in")
            aggregated["current"] = results[1]
        
        # Air Quality
        if results[2]:
            sources.append("Air Quality API")
            aggregated["air_quality"] = results[2]
        
        # Construire contexte détaillé
        context_parts = [f"🌤️ MÉTÉO COMPLÈTE - {city.upper()}\n"]
        
        # Conditions actuelles
        if aggregated.get("current") and "current_condition" in aggregated["current"]:
            curr = aggregated["current"]["current_condition"][0]
            context_parts.append("📍 CONDITIONS ACTUELLES:")
            context_parts.append(f"   Température: {curr.get('temp_C', '?')}°C")
            context_parts.append(f"   Ressenti: {curr.get('FeelsLikeC', '?')}°C")
            context_parts.append(f"   Humidité: {curr.get('humidity', '?')}%")
            context_parts.append(f"   Vent: {curr.get('windspeedKmph', '?')} km/h")
            context_parts.append(f"   Description: {curr.get('weatherDesc', [{}])[0].get('value', '')}")
        
        # Prévisions
        if aggregated.get("forecast") and "daily" in aggregated["forecast"]:
            daily = aggregated["forecast"]["daily"]
            context_parts.append("\n📅 PRÉVISIONS 3 JOURS:")
            times = daily.get("time", [])[:3]
            maxs = daily.get("temperature_2m_max", [])[:3]
            mins = daily.get("temperature_2m_min", [])[:3]
            for i, day in enumerate(times):
                context_parts.append(
                    f"   {day}: {mins[i] if i < len(mins) else '?'}°C → {maxs[i] if i < len(maxs) else '?'}°C"
                )
        
        # Air Quality
        if aggregated.get("air_quality") and "current" in aggregated["air_quality"]:
            aq = aggregated["air_quality"]["current"]
            aqi = aq.get("european_aqi", "?")
            pm25 = aq.get("pm2_5", "?")
            context_parts.append(f"\n🌬️ QUALITÉ DE L'AIR:")
            context_parts.append(f"   Indice AQI: {aqi}")
            context_parts.append(f"   PM2.5: {pm25} µg/m³")
        
        return self._build_response(
            success=len(sources) > 0,
            data=aggregated,
            context="\n".join(context_parts),
            sources=sources,
            start_time=start
        )
