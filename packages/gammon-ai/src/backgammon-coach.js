// Backgammon Learning & Coaching System
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Complete Backgammon Rules & Learning Content
const BACKGAMMON_RULES = {
  basic: {
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

  movement: {
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

  hitting: {
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

  bearing_off: {
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
  }
}

const LEARNING_MODULES = {
  beginner: {
    title: "Backgammon for Absolute Beginners",
    description: "Start from zero - learn the basics step by step",
    modules: ["basic", "movement"],
    estimatedTime: "15 minutes",
    reward: "Beginner Badge"
  },

  intermediate: {
    title: "Master the Rules",
    description: "Learn hitting, bearing off, and advanced movement",
    modules: ["hitting", "bearing_off"],
    estimatedTime: "20 minutes",
    reward: "Rules Master Badge"
  },

  strategy: {
    title: "Strategic Thinking",
    description: "Learn when to hit, when to run, and tournament tactics",
    modules: ["doubling", "endgame"],
    estimatedTime: "25 minutes",
    reward: "Strategy Expert Badge"
  }
}

const TUTORIAL_SCENARIOS = [
  {
    title: "Your First Move",
    description: "Learn how to make your first legal move",
    board: {
      // Starting position with highlights
      white: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 3, 0, 5, 0, 0, 0, 0, 0],
      black: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2]
    },
    dice: [4, 2],
    player: "white",
    objective: "Make a legal move with your checkers",
    hints: [
      "You can move any checker forward the numbers on your dice",
      "White moves from left to right (1 to 24)",
      "Make sure the point you move to has 0 or 1 opponent checkers"
    ]
  },

  {
    title: "Hitting Your Opponent",
    description: "Learn how to hit opponent checkers",
    board: {
      white: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      black: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    dice: [2, 1],
    player: "white",
    objective: "Hit the black checker on point 6",
    hints: [
      "Land on a point with exactly 1 opponent checker to hit it",
      "The hit checker goes to the bar",
      "You can hit with any legal move"
    ]
  }
]

class BackgammonCoach {
  constructor() {
    this.currentLesson = null
    this.userProgress = {}
  }

  // Get complete rule explanation
  getRuleExplanation(ruleKey) {
    return BACKGAMMON_RULES[ruleKey] || {
      title: "Rule Not Found",
      content: "This rule explanation is not available yet.",
      difficulty: "unknown"
    }
  }

  // Get learning curriculum
  getLearningCurriculum() {
    return {
      modules: LEARNING_MODULES,
      totalLessons: Object.keys(BACKGAMMON_RULES).length,
      estimatedTotalTime: Object.values(LEARNING_MODULES).reduce((total, module) =>
        total + module.estimatedTime, 0)
    }
  }

  // Get tutorial scenario
  getTutorialScenario(scenarioIndex = 0) {
    return TUTORIAL_SCENARIOS[scenarioIndex] || TUTORIAL_SCENARIOS[0]
  }

  // Validate move with educational feedback
  validateMoveWithFeedback(board, move, player, dice) {
    // Check if move is legal
    const isLegal = this.isMoveLegal(board, move, player, dice)

    if (!isLegal.legal) {
      return {
        legal: false,
        feedback: this.getEducationalFeedback(isLegal.reason, board, move, player),
        suggestion: this.getMoveSuggestion(board, player, dice),
        ruleReference: this.getRuleReference(isLegal.reason)
      }
    }

    return {
      legal: true,
      feedback: "Great move! That's perfectly legal.",
      encouragement: this.getEncouragement(board, move, player)
    }
  }

  // Educational feedback for illegal moves
  getEducationalFeedback(reason, board, move, player) {
    const feedbacks = {
      blocked: `You can't move to point ${move.to} because it's blocked by 2 or more opponent checkers. Remember: you can only land on points with 0 or 1 opponent checkers!`,

      no_checker: `You don't have a checker on point ${move.from}. Make sure you're moving one of your own checkers!`,

      wrong_direction: `Checkers move forward only. ${player === 'white' ? 'White' : 'Black'} moves ${player === 'white' ? 'clockwise' : 'counter-clockwise'} around the board.`,

      bar_required: `You have checkers on the bar that must be entered first before making other moves. Roll a number that lets you enter the board!`,

      dice_not_used: `You must use both dice if possible. Try using your remaining ${this.getRemainingDice(dice, move)}.`,

      bearing_off_too_early: `You can only bear off when all your checkers are in your home board (points 1-6 for white, 19-24 for black).`
    }

    return feedbacks[reason] || "That move isn't allowed. Try a different approach!"
  }

  // Get rule reference for learning
  getRuleReference(reason) {
    const references = {
      blocked: "movement",
      no_checker: "basic",
      wrong_direction: "movement",
      bar_required: "hitting",
      dice_not_used: "movement",
      bearing_off_too_early: "bearing_off"
    }

    return references[reason] || "basic"
  }

  // Suggest a legal move
  getMoveSuggestion(board, player, dice) {
    // Simple suggestion logic - in production this would be more sophisticated
    return `Try moving from point 1 to point ${1 + dice[0]} with your ${dice[0]} roll.`
  }

  // Encouraging feedback for good moves
  getEncouragement(board, move, player) {
    const encouragements = [
      "Excellent choice!",
      "That's a strong move!",
      "Good positioning!",
      "You're playing smart!",
      "Nice tactical move!"
    ]

    return encouragements[Math.floor(Math.random() * encouragements.length)]
  }

  // Check if move is legal (simplified)
  isMoveLegal(board, move, player, dice) {
    // This would contain the full move validation logic
    // For now, return basic checks

    if (!board.points[move.from] || board.points[move.from][player] === 0) {
      return { legal: false, reason: 'no_checker' }
    }

    // Check if destination is blocked
    const opponent = player === 'white' ? 'black' : 'white'
    if (board.points[move.to][opponent] >= 2) {
      return { legal: false, reason: 'blocked' }
    }

    return { legal: true }
  }

  // Get remaining dice (simplified)
  getRemainingDice(dice, usedMove) {
    // Calculate remaining dice after move
    return dice.filter(die => die !== usedMove.die)
  }

  // Generate learning progress report
  generateProgressReport(userId, completedLessons, gamesPlayed, winRate) {
    const progress = {
      userId,
      completedLessons,
      gamesPlayed,
      winRate,
      nextRecommendedLesson: this.getNextRecommendedLesson(completedLessons),
      achievements: this.getUnlockedAchievements(completedLessons, gamesPlayed, winRate),
      learningStreak: this.calculateLearningStreak(completedLessons),
      skillLevel: this.assessSkillLevel(gamesPlayed, winRate)
    }

    return progress
  }

  // Recommend next lesson
  getNextRecommendedLesson(completedLessons) {
    if (!completedLessons.includes('basic')) return 'basic'
    if (!completedLessons.includes('movement')) return 'movement'
    if (!completedLessons.includes('hitting')) return 'hitting'
    if (!completedLessons.includes('bearing_off')) return 'bearing_off'

    return 'strategy'
  }

  // Get unlocked achievements
  getUnlockedAchievements(lessons, games, winRate) {
    const achievements = []

    if (lessons.length >= 1) achievements.push('First Steps')
    if (lessons.length >= 2) achievements.push('Rules Rookie')
    if (lessons.length >= 4) achievements.push('Rules Master')
    if (games >= 10) achievements.push('Active Player')
    if (winRate >= 0.5) achievements.push('Winning Ways')
    if (winRate >= 0.7) achievements.push('Backgammon Buddy')

    return achievements
  }

  // Calculate learning streak
  calculateLearningStreak(completedLessons) {
    // Simple streak calculation
    return Math.min(completedLessons.length, 7)
  }

  // Assess skill level
  assessSkillLevel(games, winRate) {
    if (games < 10) return 'Beginner'
    if (winRate < 0.3) return 'Learning'
    if (winRate < 0.5) return 'Improving'
    if (winRate < 0.7) return 'Competent'
    return 'Skilled'
  }
}

// Export the coach
module.exports = { BackgammonCoach, BACKGAMMON_RULES, LEARNING_MODULES, TUTORIAL_SCENARIOS }
