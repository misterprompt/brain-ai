"""
🏆 TRUSTED SITES REGISTRY
==========================
Liste blanche des sites de qualité par domaine.
Seuls ces sites apparaîtront dans les résultats.
Maximum 10 sites par domaine = qualité garantie.
"""

# ══════════════════════════════════════════════════════════════
# PARTENAIRES PRIORITAIRES (Toujours en premier)
# ══════════════════════════════════════════════════════════════

PARTNERS = {
    "vtc": [
        {
            "domain": "galrivera.com",
            "title": "🚗 GalRivera - VTC Premium Côte d'Azur",
            "snippet": "Service VTC haut de gamme. Transferts aéroport Nice, Monaco, Cannes."
        },
        {
            "domain": "ecofundrive.com", 
            "title": "🌿 EcoFunDrive - VTC Écologique Côte d'Azur",
            "snippet": "VTC écologique. Véhicules hybrides et électriques sur la Riviera."
        }
    ]
}

# Mots-clés qui déclenchent les partenaires VTC
VTC_KEYWORDS = [
    "vtc", "chauffeur", "taxi", "transport", "aéroport", "aeroport",
    "nice", "cannes", "monaco", "antibes", "côte d'azur", "cote d'azur",
    "riviera", "transfert", "navette"
]

# ══════════════════════════════════════════════════════════════
# SITES DE QUALITÉ PAR DOMAINE (Max 10 par catégorie)
# ══════════════════════════════════════════════════════════════

TRUSTED_SITES = {
    "finance": [
        "coinmarketcap.com",
        "coingecko.com",
        "investing.com",
        "tradingview.com",
        "bloomberg.com",
        "reuters.com",
        "yahoo.com",
        "boursorama.com",
        "lesechos.fr",
        "zonebourse.com"
    ],
    
    "weather": [
        "meteofrance.com",
        "weather.com",
        "accuweather.com",
        "meteo.fr",
        "theweathernetwork.com",
        "windy.com",
        "meteoblue.com",
        "weatherunderground.com"
    ],
    
    "health": [
        "mayoclinic.org",
        "webmd.com",
        "nih.gov",
        "who.int",
        "ameli.fr",
        "doctissimo.fr",
        "passeportsante.net",
        "vidal.fr",
        "sante.gouv.fr",
        "has-sante.fr"
    ],
    
    "tech": [
        "github.com",
        "stackoverflow.com",
        "developer.mozilla.org",
        "w3schools.com",
        "freecodecamp.org",
        "medium.com",
        "dev.to",
        "npmjs.com",
        "pypi.org",
        "digitalocean.com"
    ],
    
    "tourism": [
        "tripadvisor.com",
        "booking.com",
        "airbnb.com",
        "lonelyplanet.com",
        "viator.com",
        "getyourguide.com",
        "routard.com",
        "petitfute.com",
        "france.fr",
        "mappy.com"
    ],
    
    "food": [
        "marmiton.org",
        "750g.com",
        "allrecipes.com",
        "cuisineaz.com",
        "ricardocuisine.com",
        "epicurious.com",
        "bbcgoodfood.com",
        "foodnetwork.com",
        "seriouseats.com",
        "bonappetit.com"
    ],
    
    "entertainment": [
        "imdb.com",
        "rottentomatoes.com",
        "allocine.fr",
        "senscritique.com",
        "metacritic.com",
        "themoviedb.org",
        "letterboxd.com",
        "spotify.com",
        "deezer.com",
        "pitchfork.com"
    ],
    
    "sports": [
        "espn.com",
        "lequipe.fr",
        "eurosport.fr",
        "fifa.com",
        "transfermarkt.com",
        "flashscore.com",
        "sofascore.com",
        "skysports.com",
        "sports.fr",
        "footmercato.net"
    ],
    
    "knowledge": [
        "wikipedia.org",
        "britannica.com",
        "larousse.fr",
        "universalis.fr",
        "nationalgeographic.com",
        "sciencedirect.com",
        "nature.com",
        "scholar.google.com",
        "ted.com",
        "bbc.com"
    ]
}

# ══════════════════════════════════════════════════════════════
# SITES GÉNÉRIQUES (Toujours acceptés, tous domaines)
# ══════════════════════════════════════════════════════════════

GENERAL_TRUSTED = [
    # News & Media
    "bbc.com", "bbc.co.uk", "cnn.com", "reuters.com", "apnews.com",
    "theguardian.com", "nytimes.com", "washingtonpost.com", "lemonde.fr",
    "lefigaro.fr", "liberation.fr", "20minutes.fr", "francetvinfo.fr",
    "france24.com", "rfi.fr", "euronews.com", "dw.com", "aljazeera.com",
    "elpais.com", "elmundo.es", "repubblica.it", "spiegel.de", "zeit.de",
    
    # Encyclopedia & Reference
    "wikipedia.org", "wikimedia.org", "britannica.com", "merriam-webster.com",
    "dictionary.com", "larousse.fr", "universalis.fr", "scholarpedia.org",
    
    # Government & Institutions
    "gouv.fr", "gov.uk", "gov", "edu", "ac.uk", "europa.eu",
    "who.int", "un.org", "oecd.org", "worldbank.org",
    
    # Major platforms
    "youtube.com", "reddit.com", "quora.com", "medium.com", "linkedin.com",
    "twitter.com", "x.com", "facebook.com", "instagram.com",
    
    # E-commerce & Business
    "amazon.com", "amazon.fr", "ebay.com", "etsy.com",
    "fnac.com", "cdiscount.com", "darty.com", "boulanger.com",
    
    # Food & Retail
    "marmiton.org", "750g.com", "cuisineaz.com", "auchan.fr", "carrefour.fr",
    "leclerc.fr", "lidl.fr", "intermarche.com", "monoprix.fr", "grandfrais.com",
    
    # Tech
    "github.com", "stackoverflow.com", "npmjs.com", "pypi.org",
    "developer.mozilla.org", "w3schools.com", "freecodecamp.org",
    
    # Local France
    "pagesjaunes.fr", "mappy.com", "viamichelin.fr", "google.com", "google.fr",
    
    # Travel
    "tripadvisor.com", "booking.com", "airbnb.com", "expedia.com",
    "kayak.com", "skyscanner.com", "hotels.com",
    
    # Social proof
    "trustpilot.com", "avis-verifies.com", "yelp.com",
]


def get_all_trusted_domains() -> set:
    """Retourne l'ensemble de tous les domaines de confiance."""
    all_domains = set()
    # Sites par domaine
    for sites in TRUSTED_SITES.values():
        all_domains.update(sites)
    # Sites génériques (toujours acceptés)
    all_domains.update(GENERAL_TRUSTED)
    # Partenaires
    for partner_list in PARTNERS.values():
        for partner in partner_list:
            all_domains.add(partner["domain"])
    return all_domains


def is_trusted_url(url: str) -> bool:
    """Vérifie si une URL provient d'un site de confiance."""
    url_lower = url.lower()
    for domain in get_all_trusted_domains():
        if domain in url_lower:
            return True
    return False


def get_trusted_sites_for_domain(domain: str) -> list:
    """Retourne les sites de confiance pour un domaine spécifique."""
    return TRUSTED_SITES.get(domain, TRUSTED_SITES.get("knowledge", []))


def should_show_partners(query: str) -> bool:
    """Vérifie si les partenaires VTC doivent être affichés."""
    q_lower = query.lower()
    return any(kw in q_lower for kw in VTC_KEYWORDS)


def get_partner_links(query: str) -> list:
    """Retourne les liens partenaires si applicable."""
    if not should_show_partners(query):
        return []
    
    return [
        {
            "title": p["title"],
            "url": f"https://{p['domain']}",
            "snippet": p["snippet"]
        }
        for p in PARTNERS.get("vtc", [])
    ]
