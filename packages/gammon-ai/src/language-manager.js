// Multi-Language Backgammon Learning System
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Language detection and content
const SUPPORTED_LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸' },
  fr: { name: 'Français', flag: '🇫🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  pt: { name: 'Português', flag: '🇵🇹' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  ja: { name: '日本語', flag: '🇯🇵' },
  ko: { name: '한국어', flag: '🇰🇷' },
  zh: { name: '中文', flag: '🇨🇳' },
  ar: { name: 'العربية', flag: '🇸🇦' },
  hi: { name: 'हिन्दी', flag: '🇮🇳' }
}

// Region to language mapping
const REGION_LANGUAGE_MAP = {
  'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en', 'NZ': 'en',
  'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'LU': 'fr', 'MC': 'fr',
  'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es', 'CL': 'es',
  'DE': 'de', 'AT': 'de', 'CH': 'de',
  'IT': 'it', 'VA': 'it',
  'PT': 'pt', 'BR': 'pt',
  'RU': 'ru', 'UA': 'ru', 'BY': 'ru', 'KZ': 'ru',
  'JP': 'ja',
  'KR': 'ko',
  'CN': 'zh', 'TW': 'zh', 'HK': 'zh',
  'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'MA': 'ar',
  'IN': 'hi', 'PK': 'hi', 'BD': 'hi'
}

// Translated backgammon rules content
const TRANSLATED_RULES = {
  basic: {
    en: {
      title: "Basic Rules of Backgammon",
      content: `
🎲 BACKGAMMON BASICS - Learn to Play!

Backgammon is played by two players on a board with 24 points (triangles).
Each player has 15 checkers of their color.

📋 OBJECTIVE:
Be the first to bear off (remove) all 15 of your checkers from the board.

🎯 STARTING POSITION:
- White: 2 checkers on point 1, 5 on point 12, 3 on point 17, 5 on point 19
- Black: 2 checkers on point 24, 5 on point 13, 3 on point 8, 5 on point 6

🎲 HOW TO PLAY:
1. Roll two dice each turn
2. Move your checkers forward the number of points shown on the dice
3. If you roll doubles, move 4 times the number shown
4. You can use each die separately or combine them on one checker
5. You must use both dice if possible (unless blocked)

🏠 BEARING OFF:
When all your checkers are in your home board (last 6 points), you can start bearing off by rolling numbers that match your checkers' positions.

🏆 WINNING:
- First player to bear off all 15 checkers wins
- If opponent hasn't borne off any, it's a "gammon" (double points)
- If opponent hasn't borne off any and you have a checker on the bar, it's a "backgammon" (triple points)
      `,
      difficulty: "beginner",
      estimatedTime: "5 minutes"
    },
    fr: {
      title: "Règles de Base du Backgammon",
      content: `
🎲 BASES DU BACKGAMMON - Apprenez à Jouer !

Le backgammon se joue à deux joueurs sur un plateau avec 24 points (triangles).
Chaque joueur possède 15 pions de sa couleur.

📋 OBJECTIF :
Être le premier à sortir (retirer) tous vos 15 pions du plateau.

🎯 POSITION DE DÉPART :
- Blanc : 2 pions sur la case 1, 5 sur la case 12, 3 sur la case 17, 5 sur la case 19
- Noir : 2 pions sur la case 24, 5 sur la case 13, 3 sur la case 8, 5 sur la case 6

🎲 COMMENT JOUER :
1. Lancez deux dés à chaque tour
2. Déplacez vos pions en avant du nombre de points indiqué par les dés
3. Si vous faites un double, déplacez 4 fois le nombre indiqué
4. Vous pouvez utiliser chaque dé séparément ou les combiner sur un pion
5. Vous devez utiliser les deux dés si possible (sauf si bloqué)

🏠 SORTIE DES PIONS :
Quand tous vos pions sont dans votre maison (6 dernières cases), vous pouvez commencer à sortir en lançant des numéros qui correspondent à vos pions.

🏆 GAGNER :
- Premier joueur à sortir ses 15 pions gagne
- Si l'adversaire n'a rien sorti, c'est un "gammon" (double points)
- Si l'adversaire n'a rien sorti et que vous avez un pion sur la barre, c'est un "backgammon" (triple points)
      `,
      difficulty: "débutant",
      estimatedTime: "5 minutes"
    },
    es: {
      title: "Reglas Básicas del Backgammon",
      content: `
🎲 FUNDAMENTOS DEL BACKGAMMON - ¡Aprende a Jugar!

El backgammon se juega entre dos jugadores en un tablero con 24 puntos (triángulos).
Cada jugador tiene 15 fichas de su color.

📋 OBJETIVO:
Ser el primero en sacar (remover) todas tus 15 fichas del tablero.

🎯 POSICIÓN INICIAL:
- Blancas: 2 fichas en el punto 1, 5 en el punto 12, 3 en el punto 17, 5 en el punto 19
- Negras: 2 fichas en el punto 24, 5 en el punto 13, 3 en el punto 8, 5 en el punto 6

🎲 CÓMO JUGAR:
1. Lanza dos dados cada turno
2. Mueve tus fichas hacia adelante el número de puntos mostrado en los dados
3. Si sacas dobles, mueves 4 veces el número mostrado
4. Puedes usar cada dado por separado o combinarlos en una ficha
5. Debes usar ambos dados si es posible (a menos que estés bloqueado)

🏠 SACANDO FICHAS:
Cuando todas tus fichas están en tu casa (últimos 6 puntos), puedes comenzar a sacar lanzando números que coincidan con la posición de tus fichas.

🏆 GANANDO:
- Primer jugador en sacar todas las 15 fichas gana
- Si el oponente no ha sacado ninguna, es un "gammon" (puntos dobles)
- Si el oponente no ha sacado ninguna y tienes una ficha en la barra, es un "backgammon" (puntos triples)
      `,
      difficulty: "principiante",
      estimatedTime: "5 minutos"
    },
    de: {
      title: "Grundregeln des Backgammon",
      content: `
🎲 BACKGAMMON GRUNDLAGEN - Lerne Spielen!

Backgammon wird von zwei Spielern auf einem Brett mit 24 Punkten (Dreiecken) gespielt.
Jeder Spieler hat 15 Steine seiner Farbe.

📋 ZIEL:
Sei der Erste, der alle 15 deiner Steine vom Brett nimmt (trägt sie aus).

🎯 ANFANGSSTELLUNG:
- Weiß: 2 Steine auf Punkt 1, 5 auf Punkt 12, 3 auf Punkt 17, 5 auf Punkt 19
- Schwarz: 2 Steine auf Punkt 24, 5 auf Punkt 13, 3 auf Punkt 8, 5 auf Punkt 6

🎲 WIE MAN SPIELT:
1. Wirf zwei Würfel pro Zug
2. Bewege deine Steine vorwärts um die Anzahl Punkte auf den Würfeln
3. Bei Pasch bewegst du 4-mal die gewürfelte Zahl
4. Du kannst jeden Würfel separat verwenden oder sie auf einem Stein kombinieren
5. Du musst beide Würfel verwenden, wenn möglich (außer wenn blockiert)

🏠 AUSWÜRFELN:
Wenn alle deine Steine in deinem Heim (letzte 6 Punkte) sind, kannst du beginnen auszuwürfeln, indem du Zahlen würfelst, die deinen Steinen entsprechen.

🏆 GEWINNEN:
- Erster Spieler, der alle 15 Steine auswirft, gewinnt
- Wenn Gegner keinen ausgewürfelt hat, ist es ein "Gammon" (doppelte Punkte)
- Wenn Gegner keinen ausgewürfelt hat und du einen Stein auf der Bar hast, ist es ein "Backgammon" (dreifache Punkte)
      `,
      difficulty: "anfänger",
      estimatedTime: "5 minuten"
    }
  },

  movement: {
    en: {
      title: "How to Move Checkers",
      content: `
🚀 CHECKER MOVEMENT RULES

📍 BASIC MOVEMENT:
- Checkers always move forward (clockwise for white, counter-clockwise for black)
- You can move to any open point (0 or 1 of your opponent's checkers)
- You cannot move to a point with 2+ opponent checkers (it's "blocked")

🎲 USING DICE:
Roll: 4-2
You can:
• Move one checker 4 points, another 2 points
• Move one checker 6 points (4+2)
• Move one checker 4 points, then 2 more points (if legal)

⚠️ ILLEGAL MOVES:
• Cannot move to blocked point
• Must use both dice if possible
• Cannot move more than the dice allow
• Cannot move opponent's checkers

🎯 EXAMPLES:
Roll 3-1:
✅ Legal: Move checker 3, then 1 more
✅ Legal: Move checker 4 (3+1)

Roll 5-5 (doubles):
✅ Legal: Move 4 times 5 points each (20 points total)
      `,
      difficulty: "beginner",
      estimatedTime: "7 minutes"
    },
    fr: {
      title: "Comment Déplacer les Pions",
      content: `
🚀 RÈGLES DE DÉPLACEMENT DES PIONS

📍 DÉPLACEMENT DE BASE :
- Les pions se déplacent toujours vers l'avant (sens horaire pour blanc, antihoraire pour noir)
- Vous pouvez vous déplacer vers n'importe quelle case ouverte (0 ou 1 pion adverse)
- Vous ne pouvez pas vous déplacer vers une case avec 2+ pions adverses (elle est "bloquée")

🎲 UTILISATION DES DÉS :
Lancé : 4-2
Vous pouvez :
• Déplacer un pion de 4, un autre de 2
• Déplacer un pion de 6 (4+2)
• Déplacer un pion de 4, puis 2 de plus (si légal)

⚠️ COUPS ILLÉGAUX :
• Ne peut pas aller sur une case bloquée
• Doit utiliser les deux dés si possible
• Ne peut pas se déplacer plus que les dés le permettent
• Ne peut pas déplacer les pions adverses

🎯 EXEMPLES :
Lancé 3-1 :
✅ Légal : Déplacer un pion de 3, puis 1 de plus
✅ Légal : Déplacer un pion de 4 (3+1)

Lancé 5-5 (double) :
✅ Légal : Se déplacer 4 fois 5 points chacun (20 points total)
      `,
      difficulty: "débutant",
      estimatedTime: "7 minutes"
    }
  },

  hitting: {
    en: {
      title: "Hitting & Entering from the Bar",
      content: `
💥 HITTING OPPONENTS (The Fun Part!)

🎯 HITTING:
- If you land on a point with exactly 1 opponent checker, you "hit" it
- The hit checker goes to the "bar" and must re-enter before making other moves
- You can hit with any legal move

📍 THE BAR:
- Checkers on the bar are out of play
- You must roll a number that lets you enter (move to an open point in opponent's home)
- White enters on points 1-6, Black enters on points 24-19

🎲 ENTERING FROM BAR:
Roll 2-1:
• White can enter on point 2 or 1 (if open)
• Black can enter on point 23 or 22 (if open)
• Must use both numbers if possible

⚠️ CAN'T ENTER?
If no legal entry points, you lose your turn!

🏆 STRATEGY TIP:
Hitting opponents sends them back - but don't get hit yourself!
      `,
      difficulty: "intermediate",
      estimatedTime: "6 minutes"
    },
    fr: {
      title: "Toucher & Entrer depuis la Barre",
      content: `
💥 TOUCHER LES ADVERSAIRES (La Partie Fun !)

🎯 TOUCHER :
- Si vous atterrissez sur une case avec exactement 1 pion adverse, vous le "touchez"
- Le pion touché va sur la "barre" et doit rentrer avant de faire d'autres mouvements
- Vous pouvez toucher avec n'importe quel mouvement légal

📍 LA BARRE :
- Les pions sur la barre sont hors jeu
- Vous devez lancer un numéro qui vous permet d'entrer (aller sur une case ouverte dans la maison adverse)
- Le blanc entre sur les cases 1-6, le noir entre sur les cases 24-19

🎲 ENTRER DEPUIS LA BARRE :
Lancé 2-1 :
• Le blanc peut entrer sur la case 2 ou 1 (si ouverte)
• Le noir peut entrer sur la case 23 ou 22 (si ouverte)
• Doit utiliser les deux numéros si possible

⚠️ IMPOSSIBLE D'ENTRER ?
Si aucune case d'entrée légale, vous perdez votre tour !

🏆 CONSEIL STRATÉGIQUE :
Toucher les adversaires les renvoie en arrière - mais ne vous faites pas toucher !
      `,
      difficulty: "intermédiaire",
      estimatedTime: "6 minutes"
    }
  },

  bearing_off: {
    en: {
      title: "Bearing Off & Winning the Game",
      content: `
🏠 BEARING OFF - The Home Stretch!

🎯 WHEN CAN YOU BEAR OFF?
Only when ALL your checkers are in your home board:
- White: Points 1-6 (closest to you)
- Black: Points 19-24 (closest to you)

🎲 HOW TO BEAR OFF:
Roll matches the exact position of your checkers:
- Point 6 + roll 6 = bear off
- Point 5 + roll 5 = bear off
- If you roll higher than your checkers, you must use lower numbers first

📋 EXAMPLE:
White has checkers on: 6, 5, 4, 3
Roll 6-3:
• Bear off from point 6 (exact match)
• Bear off from point 3 (exact match)

⚠️ CAN'T BEAR OFF YET?
If you have checkers outside home board, you can't bear off!

🏆 WINNING CONDITIONS:
• Race to bear off all 15 checkers first!
• Gammon: Opponent has checkers on bar or in opponent's home
• Backgammon: Gammon + opponent has checkers on bar

💰 DOUBLING CUBE:
Optional rule for higher stakes - winner gets 2x, 4x, 8x points!
      `,
      difficulty: "intermediate",
      estimatedTime: "8 minutes"
    },
    fr: {
      title: "Sortie des Pions & Gagner la Partie",
      content: `
🏠 SORTIE DES PIONS - La Ligne Droite !

🎯 QUAND PEUT-ON SORTIR LES PIONS ?
Seulement quand TOUS vos pions sont dans votre maison :
- Blanc : Cases 1-6 (les plus proches de vous)
- Noir : Cases 19-24 (les plus proches de vous)

🎲 COMMENT SORTIR LES PIONS :
Le lancé correspond à la position exacte de vos pions :
- Case 6 + lancé 6 = sortie
- Case 5 + lancé 5 = sortie
- Si vous lancez plus haut que vos pions, vous devez utiliser les nombres plus bas d'abord

📋 EXEMPLE :
Le blanc a des pions sur : 6, 5, 4, 3
Lancé 6-3 :
• Sortir de la case 6 (correspondance exacte)
• Sortir de la case 3 (correspondance exacte)

⚠️ IMPOSSIBLE DE SORTIR ENCORE ?
Si vous avez des pions en dehors de la maison, vous ne pouvez pas sortir !

🏆 CONDITIONS DE VICTOIRE :
• Course pour sortir ses 15 pions en premier !
• Gammon : L'adversaire a des pions sur la barre ou dans la maison adverse
• Backgammon : Gammon + l'adversaire a des pions sur la barre

💰 CUBE DE DOUBLE :
Règle optionnelle pour enjeux plus élevés - le gagnant obtient 2x, 4x, 8x points !
      `,
      difficulty: "intermédiaire",
      estimatedTime: "8 minutes"
    }
  }
}

// Language detection and management
class LanguageManager {
  constructor() {
    this.userLanguages = new Map()
  }

  // Detect user language from request
  detectLanguage(req) {
    // Check for explicit language preference in headers
    const acceptLanguage = req.headers['accept-language']
    const explicitLang = req.headers['x-user-language']

    if (explicitLang && SUPPORTED_LANGUAGES[explicitLang]) {
      return explicitLang
    }

    // Parse Accept-Language header
    if (acceptLanguage) {
      const languages = acceptLanguage.split(',')
        .map(lang => lang.split(';')[0].split('-')[0])
        .filter(lang => SUPPORTED_LANGUAGES[lang])

      if (languages.length > 0) {
        return languages[0]
      }
    }

    // Detect from client region (if available)
    const clientRegion = req.headers['x-client-region'] || req.headers['cf-ipcountry']
    if (clientRegion && REGION_LANGUAGE_MAP[clientRegion]) {
      return REGION_LANGUAGE_MAP[clientRegion]
    }

    // Default to English
    return 'en'
  }

  // Get translated content
  getTranslatedContent(ruleKey, language = 'en') {
    const ruleData = TRANSLATED_RULES[ruleKey]
    if (!ruleData) return null

    return ruleData[language] || ruleData['en'] // Fallback to English
  }

  // Get supported languages
  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES
  }

  // Set user language preference
  async setUserLanguage(userId, language) {
    if (!SUPPORTED_LANGUAGES[language]) {
      throw new Error('Unsupported language')
    }

    this.userLanguages.set(userId, language)

    // Save to database
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          language: language,
          updated_at: new Date()
        })
    } catch (error) {
      console.warn('Could not save language preference:', error.message)
    }

    return language
  }

  // Get user language preference
  async getUserLanguage(userId) {
    // Check in-memory cache first
    if (this.userLanguages.has(userId)) {
      return this.userLanguages.get(userId)
    }

    // Check database
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('language')
        .eq('user_id', userId)
        .single()

      if (data?.language) {
        this.userLanguages.set(userId, data.language)
        return data.language
      }
    } catch (error) {
      console.warn('Could not retrieve language preference:', error.message)
    }

    return null // Will fall back to auto-detection
  }
}

// Export the language manager
module.exports = { LanguageManager, SUPPORTED_LANGUAGES, TRANSLATED_RULES, REGION_LANGUAGE_MAP }
