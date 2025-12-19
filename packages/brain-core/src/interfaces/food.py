"""
🍳 FOOD INTERFACE
=================
Gère la cuisine : Recettes, Ingrédients, Cocktails.
TheMealDB, TheCocktailDB, OpenFoodFacts.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from urllib.parse import quote
import re

from .base import BaseInterface


class FoodInterface(BaseInterface):
    """
    Expert Cuisine : Recettes et Nutrition.
    """
    
    DOMAIN_NAME = "food"
    
    KEYWORDS = [
        # Recettes et cuisine
        "recette", "recipe", "cuisine", "cooking", "cuisiner", "cook",
        "ingrédient", "ingredient", "plat", "dish", "repas", "meal",
        "gâteau", "gateau", "cake", "pizza", "pasta", "salade", "salad",
        "poulet", "chicken", "boeuf", "beef", "poisson", "fish",
        "cocktail", "boisson", "drink", "dessert", "entrée", "appetizer",
        "végétarien", "vegetarian", "vegan", "calories", "nutrition",
        # Supermarchés et magasins alimentaires
        "supermarché", "supermarket", "épicerie", "grocery", "magasin",
        "grand frais", "carrefour", "leclerc", "auchan", "lidl", "intermarché",
        "monoprix", "franprix", "casino", "picard", "bio c bon", "naturalia",
        "trader joe", "whole foods", "walmart", "costco", "tesco", "aldi",
        # Produits alimentaires
        "produits frais", "fresh", "fruits", "légumes", "vegetables", "viande", "meat",
        "fromage", "cheese", "pain", "bread", "lait", "milk", "œufs", "eggs",
        "bio", "organic", "chocolat", "chocolate", "café", "coffee", "thé", "tea",
        # Plats et cuisines
        "burger", "sushi", "ramen", "risotto", "tiramisu", "lasagne", "quiche",
        "crêpe", "pancake", "omelette", "soupe", "soup", "gratin", "tarte",
        "couscous", "tajine", "paella", "curry", "wok", "barbecue", "bbq",
        # Restaurant et livraison
        "restaurant", "traiteur", "livraison", "delivery", "uber eats", "deliveroo",
        "manger", "eat", "food", "aliment", "alimentation"
    ]
    
    PATTERNS = [
        r"\brecette\s+(de|du|d[e'])?\s*\w+\b",
        r"\bcomment\s+(faire|préparer|cuisiner)\b",
        r"\b(pizza|burger|sushi|ramen|pasta|risotto|tiramisu)\b",
        r"\bingredients?\s+(pour|de)\b",
        r"\bgrand\s+frais\b",  # Pattern spécifique pour Grand Frais
        r"\b(supermarché|épicerie|magasin)\s+\w+\b",
    ]
    
    def extract_params(self, query: str) -> Dict[str, Any]:
        """Extrait le plat ou ingrédient."""
        q_lower = query.lower()
        params = {"query": query, "search_term": quote(query)}
        
        # Détecter si c'est un cocktail
        if any(w in q_lower for w in ["cocktail", "mojito", "margarita", "martini", "whisky", "rum"]):
            params["type"] = "cocktail"
        else:
            params["type"] = "meal"
        
        return params
    
    async def fetch_speed_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mode Speed : TheMealDB ou TheCocktailDB."""
        start = datetime.now()
        
        search_term = params.get("search_term", quote(query))
        content_type = params.get("type", "meal")
        
        if content_type == "cocktail":
            url = f"https://www.thecocktaildb.com/api/json/v1/1/search.php?s={search_term}"
        else:
            url = f"https://www.themealdb.com/api/json/v1/1/search.php?s={search_term}"
        
        data = await self._fetch_json(url, timeout=self.SPEED_TIMEOUT)
        
        if not data:
            return self._build_response(
                success=False,
                data={},
                context="Pas de recette trouvée pour cette recherche.",
                sources=[],
                start_time=start
            )
        
        context_lines = ["🍳 RECETTES TROUVÉES:\n"]
        source = "TheCocktailDB" if content_type == "cocktail" else "TheMealDB"
        
        if content_type == "cocktail" and data.get("drinks"):
            for drink in data["drinks"][:3]:
                name = drink.get("strDrink", "?")
                glass = drink.get("strGlass", "?")
                instructions = drink.get("strInstructions", "")[:150]
                context_lines.append(f"🍹 {name}")
                context_lines.append(f"   Verre: {glass}")
                context_lines.append(f"   {instructions}...")
        
        elif data.get("meals"):
            for meal in data["meals"][:3]:
                name = meal.get("strMeal", "?")
                category = meal.get("strCategory", "?")
                area = meal.get("strArea", "?")
                instructions = meal.get("strInstructions", "")[:200]
                
                context_lines.append(f"🍽️ {name}")
                context_lines.append(f"   Catégorie: {category} | Origine: {area}")
                context_lines.append(f"   {instructions}...")
        else:
            return self._build_response(
                success=False,
                data={},
                context="Aucune recette trouvée.",
                sources=[],
                start_time=start
            )
        
        return self._build_response(
            success=True,
            data=data,
            context="\n".join(context_lines),
            sources=[source],
            start_time=start
        )
    
    async def fetch_deep_data(self, query: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mode Deep : TheMealDB + TheCocktailDB + OpenFoodFacts."""
        start = datetime.now()
        
        search_term = params.get("search_term", quote(query))
        
        urls = [
            f"https://www.themealdb.com/api/json/v1/1/search.php?s={search_term}",
            f"https://www.thecocktaildb.com/api/json/v1/1/search.php?s={search_term}",
            f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={search_term}&json=1&page_size=5",
        ]
        
        results = await self._fetch_multiple(urls, timeout=self.DEEP_TIMEOUT)
        
        sources = []
        aggregated = {}
        
        if results[0] and results[0].get("meals"):
            sources.append("TheMealDB")
            aggregated["meals"] = results[0]["meals"]
        
        if results[1] and results[1].get("drinks"):
            sources.append("TheCocktailDB")
            aggregated["drinks"] = results[1]["drinks"]
        
        if results[2] and results[2].get("products"):
            sources.append("OpenFoodFacts")
            aggregated["products"] = results[2]["products"]
        
        context_parts = ["🍳 GUIDE CULINAIRE COMPLET:\n"]
        
        # Recettes
        if aggregated.get("meals"):
            context_parts.append("🍽️ RECETTES:")
            for meal in aggregated["meals"][:3]:
                name = meal.get("strMeal", "?")
                category = meal.get("strCategory", "?")
                context_parts.append(f"   • {name} ({category})")
                
                # Lister quelques ingrédients
                ingredients = []
                for i in range(1, 6):
                    ing = meal.get(f"strIngredient{i}")
                    if ing and ing.strip():
                        ingredients.append(ing)
                if ingredients:
                    context_parts.append(f"     Ingrédients: {', '.join(ingredients)}")
        
        # Cocktails
        if aggregated.get("drinks"):
            context_parts.append("\n🍹 COCKTAILS:")
            for drink in aggregated["drinks"][:3]:
                context_parts.append(f"   • {drink.get('strDrink', '?')} ({drink.get('strGlass', '?')})")
        
        # Produits
        if aggregated.get("products"):
            context_parts.append("\n📦 PRODUITS:")
            for product in aggregated["products"][:3]:
                name = product.get("product_name", "?")
                nutri = product.get("nutriscore_grade", "?").upper()
                context_parts.append(f"   • {name} (Nutri-Score: {nutri})")
        
        return self._build_response(
            success=len(sources) > 0,
            data=aggregated,
            context="\n".join(context_parts),
            sources=sources,
            start_time=start
        )
