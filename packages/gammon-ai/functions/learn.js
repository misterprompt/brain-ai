// Backgammon Learning API - Complete Educational System
const { createClient } = require('@supabase/supabase-js')
const { BackgammonCoach, BACKGAMMON_RULES, LEARNING_MODULES, TUTORIAL_SCENARIOS } = require('../src/backgammon-coach')
const { LanguageManager } = require('../src/language-manager')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const coach = new BackgammonCoach()
const languageManager = new LanguageManager()

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Language',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // Authentication check
  if (!event.headers.authorization?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authentication required' })
    }
  }

  try {
    const path = event.path.replace('/.netlify/functions/learn/', '')
    const method = event.httpMethod
    const body = event.body ? JSON.parse(event.body) : {}

    // Detect user language
    let userLanguage = await getUserLanguage(event)

    // Allow language override via query parameter or header
    const queryLang = event.queryStringParameters?.lang
    const headerLang = event.headers['x-user-language']
    if (queryLang && languageManager.getSupportedLanguages()[queryLang]) {
      userLanguage = queryLang
    } else if (headerLang && languageManager.getSupportedLanguages()[headerLang]) {
      userLanguage = headerLang
    }

    // Route handling
    switch (`${method} ${path}`) {
      case 'GET rules':
        return await getRules(event, userLanguage)
      case 'GET rules/basic':
      case 'GET rules/movement':
      case 'GET rules/hitting':
      case 'GET rules/bearing_off':
        const ruleKey = path.split('/').pop()
        return await getSpecificRule(event, ruleKey, userLanguage)
      case 'GET curriculum':
        return await getCurriculum(event, userLanguage)
      case 'GET tutorials':
        return await getTutorials(event, userLanguage)
      case 'GET tutorials/0':
      case 'GET tutorials/1':
        const tutorialIndex = parseInt(path.split('/').pop())
        return await getTutorialScenario(event, tutorialIndex, userLanguage)
      case 'POST validate-move':
        return await validateMoveWithFeedback(event, body, userLanguage)
      case 'GET progress':
        return await getLearningProgress(event, userLanguage)
      case 'POST complete-lesson':
        return await completeLesson(event, body, userLanguage)
      case 'GET achievements':
        return await getAchievements(event, userLanguage)
      case 'GET languages':
        return await getSupportedLanguages(event)
      case 'POST set-language':
        return await setUserLanguage(event, body)
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Learning endpoint not found' })
        }
    }

  } catch (error) {
    console.error('Learning API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Learning system error',
        message: error.message
      })
    }
  }
}

// Get user language preference or detect from request
async function getUserLanguage(event) {
  try {
    const token = event.headers.authorization.substring(7)
    const { data: { user } } = await supabase.auth.getUser(token)

    if (user) {
      const savedLanguage = await languageManager.getUserLanguage(user.id)
      if (savedLanguage) {
        return savedLanguage
      }
    }
  } catch (error) {
    console.warn('Could not get user language preference:', error.message)
  }

  // Fall back to auto-detection
  return languageManager.detectLanguage(event)
}

// Get all available rules in user's language
async function getRules(event, language) {
  const rules = Object.keys(BACKGAMMON_RULES).map(key => {
    const translatedRule = languageManager.getTranslatedContent(key, language)
    return {
      id: key,
      title: translatedRule?.title || `${key} rules`,
      difficulty: translatedRule?.difficulty || 'unknown',
      estimatedTime: translatedRule?.estimatedTime || '5 minutes'
    }
  })

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'X-Content-Language': language
    },
    body: JSON.stringify({
      success: true,
      language: language,
      supportedLanguages: Object.keys(languageManager.getSupportedLanguages()),
      data: {
        rules,
        totalRules: rules.length,
        message: getLocalizedMessage('rules_welcome', language)
      }
    })
  }
}

// Get specific rule explanation in user's language
async function getSpecificRule(event, ruleKey, language) {
  const rule = languageManager.getTranslatedContent(ruleKey, language)

  if (!rule) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: `Rule ${ruleKey} not found in language ${language}` })
    }
  }

  // Track that user viewed this rule
  const token = event.headers.authorization.substring(7)
  try {
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) {
      await supabase
        .from('user_learning_progress')
        .upsert({
          user_id: user.id,
          rule_key: ruleKey,
          viewed_at: new Date(),
          completed: false,
          language: language
        })
    }
  } catch (error) {
    console.warn('Could not track rule view:', error.message)
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'X-Content-Language': language
    },
    body: JSON.stringify({
      success: true,
      language: language,
      data: {
        rule,
        nextRule: getNextRule(ruleKey, language),
        progress: getLocalizedMessage('rule_progress', language, { rule: ruleKey })
      }
    })
  }
}

// Get learning curriculum in user's language
async function getCurriculum(event, language) {
  const curriculum = coach.getLearningCurriculum()

  // Translate module information
  const translatedModules = {}
  Object.keys(LEARNING_MODULES).forEach(key => {
    translatedModules[key] = {
      ...LEARNING_MODULES[key],
      title: getLocalizedMessage(`${key}_module_title`, language),
      description: getLocalizedMessage(`${key}_module_desc`, language)
    }
  })

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'X-Content-Language': language
    },
    body: JSON.stringify({
      success: true,
      language: language,
      data: {
        curriculum: {
          ...curriculum,
          modules: translatedModules
        },
        message: getLocalizedMessage('curriculum_message', language)
      }
    })
  }
}

// Get available tutorials in user's language
async function getTutorials(event, language) {
  const tutorials = TUTORIAL_SCENARIOS.map((scenario, index) => ({
    id: index,
    title: getLocalizedMessage(`tutorial_${index}_title`, language),
    description: getLocalizedMessage(`tutorial_${index}_desc`, language),
    difficulty: "beginner",
    estimatedTime: "3 minutes"
  }))

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'X-Content-Language': language
    },
    body: JSON.stringify({
      success: true,
      data: {
        tutorials,
        message: getLocalizedMessage('tutorials_message', language)
      }
    })
  }
}

// Get specific tutorial scenario in user's language
async function getTutorialScenario(event, index, language) {
  const scenario = coach.getTutorialScenario(index)

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'X-Content-Language': language
    },
    body: JSON.stringify({
      success: true,
      data: {
        scenario: {
          ...scenario,
          title: getLocalizedMessage(`tutorial_${index}_title`, language),
          description: getLocalizedMessage(`tutorial_${index}_desc`, language),
          objective: getLocalizedMessage(`tutorial_${index}_objective`, language)
        },
        message: getLocalizedMessage('tutorial_start', language, { title: scenario.title })
      }
    })
  }
}

// Validate move with educational feedback in user's language
async function validateMoveWithFeedback(event, body, language) {
  const { board, move, player, dice } = body

  if (!board || !move || !player || !dice) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: getLocalizedMessage('missing_fields', language)
      })
    }
  }

  const result = coach.validateMoveWithFeedback(board, move, player, dice)

  // Translate feedback messages
  const translatedResult = {
    ...result,
    feedback: translateFeedback(result.feedback, language),
    encouragement: result.encouragement ? translateEncouragement(result.encouragement, language) : undefined
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'X-Content-Language': language
    },
    body: JSON.stringify({
      success: true,
      language: language,
      data: {
        validation: translatedResult,
        learningTip: result.legal ?
          getLocalizedMessage('good_move_tip', language) :
          getLocalizedMessage('mistake_learning_tip', language)
      }
    })
  }
}

// Get supported languages
async function getSupportedLanguages(event) {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      data: {
        languages: languageManager.getSupportedLanguages(),
        regions: REGION_LANGUAGE_MAP,
        message: "Choose your preferred language for learning backgammon!"
      }
    })
  }
}

// Set user language preference
async function setUserLanguage(event, body) {
  const { language } = body

  if (!language) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Language code is required' })
    }
  }

  try {
    const token = event.headers.authorization.substring(7)
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'User not authenticated' })
      }
    }

    const savedLanguage = await languageManager.setUserLanguage(user.id, language)

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: {
          language: savedLanguage,
          message: `Language preference set to ${languageManager.getSupportedLanguages()[savedLanguage]?.name}`
        }
      })
    }
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    }
  }
}

// Helper functions
function getNextRule(currentRule, language) {
  const ruleOrder = ['basic', 'movement', 'hitting', 'bearing_off']
  const currentIndex = ruleOrder.indexOf(currentRule)

  if (currentIndex === -1 || currentIndex === ruleOrder.length - 1) {
    return null
  }

  const nextRuleKey = ruleOrder[currentIndex + 1]
  const nextRule = languageManager.getTranslatedContent(nextRuleKey, language)
  return nextRule ? nextRule.title : nextRuleKey
}

// Localized message helper
function getLocalizedMessage(key, language, params = {}) {
  const messages = {
    en: {
      rules_welcome: "Welcome to Backgammon Learning! Start with the 'basic' rules.",
      rule_progress: "You've learned about {rule} rules! Keep going!",
      curriculum_message: "Complete these modules to become a backgammon expert!",
      tutorials_message: "Interactive tutorials to practice what you've learned!",
      tutorial_start: "Tutorial: {title} - Let's learn by doing!",
      good_move_tip: "Great job! Keep practicing to improve your skills.",
      mistake_learning_tip: "Don't worry about mistakes - they're how you learn!",
      missing_fields: "Missing required fields: board, move, player, dice"
    },
    fr: {
      rules_welcome: "Bienvenue dans l'apprentissage du Backgammon ! Commencez par les règles 'basic'.",
      rule_progress: "Vous avez appris les règles {rule} ! Continuez !",
      curriculum_message: "Complétez ces modules pour devenir un expert du backgammon !",
      tutorials_message: "Tutoriels interactifs pour pratiquer ce que vous avez appris !",
      tutorial_start: "Tutoriel : {title} - Apprenons en faisant !",
      good_move_tip: "Excellent ! Continuez à pratiquer pour améliorer vos compétences.",
      mistake_learning_tip: "Ne vous inquiétez pas des erreurs - c'est comme ça qu'on apprend !",
      missing_fields: "Champs requis manquants : board, move, player, dice"
    }
  }

  const langMessages = messages[language] || messages['en']
  let message = langMessages[key] || messages['en'][key] || key

  // Replace parameters
  Object.keys(params).forEach(param => {
    message = message.replace(`{${param}}`, params[param])
  })

  return message
}

// Translate feedback messages
function translateFeedback(feedback, language) {
  // Simple translation mapping - in production, this would be more comprehensive
  const translations = {
    fr: {
      "You can't move to point": "Vous ne pouvez pas vous déplacer vers la case",
      "because it's blocked": "parce qu'elle est bloquée",
      "You don't have a checker": "Vous n'avez pas de pion",
      "Illegal move": "Coup illégal",
      "Great move": "Excellent coup"
    }
  }

  if (language === 'fr' && translations.fr) {
    let translated = feedback
    Object.entries(translations.fr).forEach(([en, fr]) => {
      translated = translated.replace(new RegExp(en, 'g'), fr)
    })
    return translated
  }

  return feedback
}

// Translate encouragement messages
function translateEncouragement(encouragement, language) {
  const translations = {
    fr: {
      "Excellent choice!": "Excellent choix !",
      "That's a strong move!": "C'est un coup fort !",
      "Good positioning!": "Bonne position !",
      "You're playing smart!": "Vous jouez intelligemment !",
      "Nice tactical move!": "Beau coup tactique !"
    }
  }

  if (language === 'fr' && translations.fr) {
    return translations.fr[encouragement] || encouragement
  }

  return encouragement
}

// Reuse existing functions but with language parameter
async function getLearningProgress(event, language) {
  // Implementation would be similar to before but with translations
  return await getLearningProgress(event) // For now, reuse existing
}

async function completeLesson(event, body, language) {
  // Implementation would be similar to before but with translations
  return await completeLesson(event, body) // For now, reuse existing
}

async function getAchievements(event, language) {
  // Implementation would be similar to before but with translations
  return await getAchievements(event) // For now, reuse existing
}

// Get all available rules
async function getRules(event) {
  const rules = Object.keys(BACKGAMMON_RULES).map(key => ({
    id: key,
    title: BACKGAMMON_RULES[key].title,
    difficulty: BACKGAMMON_RULES[key].difficulty,
    estimatedTime: BACKGAMMON_RULES[key].estimatedTime
  }))

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      data: {
        rules,
        totalRules: rules.length,
        message: "Welcome to Backgammon Learning! Start with the 'basic' rules."
      }
    })
  }
}

// Get specific rule explanation
async function getSpecificRule(event, ruleKey) {
  const rule = coach.getRuleExplanation(ruleKey)

  // Track that user viewed this rule
  const token = event.headers.authorization.substring(7)
  try {
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) {
      await supabase
        .from('user_learning_progress')
        .upsert({
          user_id: user.id,
          rule_key: ruleKey,
          viewed_at: new Date(),
          completed: false
        })
    }
  } catch (error) {
    console.warn('Could not track rule view:', error.message)
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      data: {
        rule,
        nextRule: getNextRule(ruleKey),
        progress: `You've learned about ${ruleKey} rules!`
      }
    })
  }
}

// Get learning curriculum
async function getCurriculum(event) {
  const curriculum = coach.getLearningCurriculum()

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      data: {
        curriculum,
        message: "Complete these modules to become a backgammon expert!",
        totalEstimatedTime: curriculum.estimatedTotalTime + " minutes"
      }
    })
  }
}

// Get available tutorials
async function getTutorials(event) {
  const tutorials = TUTORIAL_SCENARIOS.map((scenario, index) => ({
    id: index,
    title: scenario.title,
    description: scenario.description,
    difficulty: "beginner",
    estimatedTime: "3 minutes"
  }))

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      data: {
        tutorials,
        message: "Interactive tutorials to practice what you've learned!"
      }
    })
  }
}

// Get specific tutorial scenario
async function getTutorialScenario(event, index) {
  const scenario = coach.getTutorialScenario(index)

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      data: {
        scenario,
        message: `Tutorial: ${scenario.title} - ${scenario.objective}`
      }
    })
  }
}

// Validate move with educational feedback
async function validateMoveWithFeedback(event, body) {
  const { board, move, player, dice } = body

  if (!board || !move || !player || !dice) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Missing required fields: board, move, player, dice'
      })
    }
  }

  const result = coach.validateMoveWithFeedback(board, move, player, dice)

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      data: {
        validation: result,
        learningTip: result.legal ?
          "Great job! Keep practicing to improve your skills." :
          "Don't worry about mistakes - they're how you learn!"
      }
    })
  }
}

// Get user's learning progress
async function getLearningProgress(event) {
  try {
    const token = event.headers.authorization.substring(7)
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'User not authenticated' })
      }
    }

    // Get learning progress from database
    const { data: progress } = await supabase
      .from('user_learning_progress')
      .select('*')
      .eq('user_id', user.id)

    // Get game statistics
    const { data: games } = await supabase
      .from('games')
      .select('winner')
      .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)

    const gamesPlayed = games?.length || 0
    const wins = games?.filter(game =>
      (game.white_player_id === user.id && game.winner === 'white') ||
      (game.black_player_id === user.id && game.winner === 'black')
    ).length || 0

    const winRate = gamesPlayed > 0 ? wins / gamesPlayed : 0
    const completedLessons = progress?.map(p => p.rule_key) || []

    const progressReport = coach.generateProgressReport(
      user.id,
      completedLessons,
      gamesPlayed,
      winRate
    )

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: {
          progress: progressReport,
          message: `You've completed ${completedLessons.length} lessons and played ${gamesPlayed} games!`
        }
      })
    }
  } catch (error) {
    console.error('Progress retrieval error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Could not retrieve learning progress' })
    }
  }
}

// Mark lesson as completed
async function completeLesson(event, body) {
  const { lessonKey } = body

  if (!lessonKey) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'lessonKey is required' })
    }
  }

  try {
    const token = event.headers.authorization.substring(7)
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'User not authenticated' })
      }
    }

    // Mark lesson as completed
    await supabase
      .from('user_learning_progress')
      .upsert({
        user_id: user.id,
        rule_key: lessonKey,
        completed_at: new Date(),
        completed: true
      })

    const nextLesson = coach.getNextRecommendedLesson([lessonKey])

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: {
          completedLesson: lessonKey,
          nextLesson: nextLesson,
          message: `Congratulations! You've completed the ${lessonKey} lesson.`,
          achievement: getLessonAchievement(lessonKey)
        }
      })
    }
  } catch (error) {
    console.error('Lesson completion error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Could not complete lesson' })
    }
  }
}

// Get user's achievements
async function getAchievements(event) {
  try {
    const token = event.headers.authorization.substring(7)
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'User not authenticated' })
        }
    }

    // Get achievements from database
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: {
          achievements: achievements || [],
          message: `You've earned ${achievements?.length || 0} achievements!`
        }
      })
    }
  } catch (error) {
    console.error('Achievements retrieval error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Could not retrieve achievements' })
    }
  }
}

// Helper functions
function getNextRule(currentRule) {
  const ruleOrder = ['basic', 'movement', 'hitting', 'bearing_off']
  const currentIndex = ruleOrder.indexOf(currentRule)

  if (currentIndex === -1 || currentIndex === ruleOrder.length - 1) {
    return null
  }

  return ruleOrder[currentIndex + 1]
}

function getLessonAchievement(lessonKey) {
  const achievements = {
    basic: '🎯 First Steps',
    movement: '🚀 Moving Master',
    hitting: '💥 Hitting Hero',
    bearing_off: '🏠 Bearing Off Boss'
  }

  return achievements[lessonKey] || '📚 Knowledge Seeker'
}
