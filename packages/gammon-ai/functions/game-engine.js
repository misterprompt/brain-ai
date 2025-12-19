// Complete Game Management with Full Backgammon Engine
const { createClient } = require('@supabase/supabase-js')
const { BackgammonGame } = require('../src/backgammon-engine')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// In-memory game storage (in production, use Redis or database)
const activeGames = new Map()

exports.handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/game-engine/', '')
  const method = event.httpMethod

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Authentication check for protected routes
    if (!['/health'].includes(path)) {
      const authHeader = event.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        }
      }

      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabase.auth.getUser(token)

      if (error || !user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid token' })
        }
      }

      event.user = user
    }

    // Route handling
    switch (`${method} ${path}`) {
      case 'POST /games':
        return await createGame(event)
      case 'GET /games':
        return await listGames(event)
      case 'GET /games/my-games':
        return await getMyGames(event)
      case `GET /games/${event.path.split('/').pop()}`:
        return await getGame(event)
      case `POST /games/${event.path.split('/').pop()}/roll`:
        return await rollDice(event)
      case `POST /games/${event.path.split('/').pop()}/move`:
        return await makeMove(event)
      case `GET /games/${event.path.split('/').pop()}/moves`:
        return await getAvailableMoves(event)
      case `GET /games/${event.path.split('/').pop()}/pip-count`:
        return await getPipCount(event)
      case `POST /games/${event.path.split('/').pop()}/double`:
        return await doubleCube(event)
      case `POST /games/${event.path.split('/').pop()}/double-response`:
        return await respondToDouble(event)
      case 'GET /health':
        return await healthCheck(event)
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Not found' })
        }
    }

  } catch (error) {
    console.error('Game engine error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}

// Create a new backgammon game
async function createGame(event) {
  const body = JSON.parse(event.body)
  const { gameMode, opponentType, difficulty } = body

  const user = event.user

  // Create game instance
  const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const game = new BackgammonGame(
    gameId,
    { id: user.id, username: user.user_metadata?.name || user.email },
    opponentType === 'ai' ? { id: 'ai', username: 'AI Opponent' } : null
  )

  // Initialize board
  game.setupInitialPosition()

  // Store in memory (in production, use database)
  activeGames.set(gameId, game)

  // Save to database
  await supabase
    .from('games')
    .insert({
      id: gameId,
      white_player_id: user.id,
      black_player_id: opponentType === 'ai' ? 'ai' : null,
      game_mode: gameMode || 'AI_VS_PLAYER',
      status: 'PLAYING',
      board_state: JSON.stringify(game.board),
      current_player: game.currentPlayer,
      created_at: game.createdAt
    })

  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify({
      success: true,
      data: {
        game: game.getGameState()
      }
    })
  }
}

// List available games
async function listGames(event) {
  const games = Array.from(activeGames.values())
    .filter(game => game.status === 'WAITING')
    .map(game => ({
      id: game.gameId,
      whitePlayer: game.whitePlayer,
      createdAt: game.createdAt
    }))

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify({
      success: true,
      data: { games }
    })
  }
}

// Get user's games
async function getMyGames(event) {
  const user = event.user

  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify({
      success: true,
      data: { games }
    })
  }
}

// Get specific game
async function getGame(event) {
  const gameId = event.path.split('/').pop()
  const game = activeGames.get(gameId)

  if (!game) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Game not found' })
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify({
      success: true,
      data: {
        game: game.getGameState()
      }
    })
  }
}

// Roll dice
async function rollDice(event) {
  const gameId = event.path.split('/').slice(-2)[0]
  const game = activeGames.get(gameId)

  if (!game) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Game not found' })
    }
  }

  try {
    const dice = game.rollDice()

    // Update database
    await supabase
      .from('games')
      .update({
        dice: dice,
        updated_at: new Date()
      })
      .eq('id', gameId)

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        data: {
          dice,
          availableMoves: game.moves.length
        }
      })
    }
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: error.message })
    }
  }
}

// Make a move
async function makeMove(event) {
  const gameId = event.path.split('/').slice(-2)[0]
  const game = activeGames.get(gameId)
  const body = JSON.parse(event.body)
  const { from, to, gnubgNotation } = body

  if (!game) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Game not found' })
    }
  }

  try {
    let move

    // Support both internal format and GNUBG notation
    if (gnubgNotation) {
      // Parse GNUBG notation
      move = game.parseGNUBGNotation(gnubgNotation, game.currentPlayer)
    } else {
      // Use internal format
      move = { from, to, player: game.currentPlayer }
    }

    // Find the move in available moves
    const availableMove = game.moves.find(m =>
      m.from === move.from && m.to === move.to
    )

    if (!availableMove) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify({
          error: 'Illegal move',
          availableMoves: game.moves.map(m => ({
            ...m,
            gnubgNotation: game.moveToGNUBGNotation(m)
          }))
        })
      }
    }

    // Make the move
    const result = game.makeMove(availableMove)

    // Update database
    await supabase
      .from('games')
      .update({
        board_state: JSON.stringify(game.board),
        current_player: game.currentPlayer,
        status: game.status,
        winner: game.winner,
        score_white: game.score.white,
        score_black: game.score.black,
        dice: game.dice,
        updated_at: new Date()
      })
      .eq('id', gameId)

    // Check if AI should move
    let aiMove = null
    if (game.currentPlayer === 'black' && game.blackPlayer.id === 'ai') {
      aiMove = await makeAIMove(game)
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        data: {
          move: {
            ...result,
            gnubgNotation: game.moveToGNUBGNotation(result)
          },
          gameState: game.getGameState(),
          aiMove: aiMove ? {
            ...aiMove,
            gnubgNotation: game.moveToGNUBGNotation(aiMove)
          } : null
        }
      })
    }
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: error.message })
    }
  }
}

// Get available moves
async function getAvailableMoves(event) {
  const gameId = event.path.split('/').pop()
  const game = activeGames.get(gameId)

  if (!game) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Game not found' })
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify({
      success: true,
      data: {
        availableMoves: game.moves
      }
    })
  }
}

// Get pip count
async function getPipCount(event) {
  const gameId = event.path.split('/').pop()
  const game = activeGames.get(gameId)

  if (!game) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Game not found' })
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify({
      success: true,
      data: {
        pipCount: {
          white: game.calculatePipCount('white'),
          black: game.calculatePipCount('black')
        }
      }
    })
  }
}

// Double the cube
async function doubleCube(event) {
  const gameId = event.path.split('/').slice(-2)[0]
  const game = activeGames.get(gameId)

  if (!game) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Game not found' })
    }
  }

  try {
    game.doubleCube()

    // Update database
    await supabase
      .from('games')
      .update({
        doubling_cube: game.doublingCube,
        current_player: game.currentPlayer,
        updated_at: new Date()
      })
      .eq('id', gameId)

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        data: {
          doublingCube: game.doublingCube,
          currentPlayer: game.currentPlayer
        }
      })
    }
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: error.message })
    }
  }
}

// Respond to double
async function respondToDouble(event) {
  const gameId = event.path.split('/').slice(-2)[0]
  const game = activeGames.get(gameId)
  const body = JSON.parse(event.body)
  const { accept } = body

  if (!game) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Game not found' })
    }
  }

  try {
    game.respondToDouble(accept)

    // Update database
    await supabase
      .from('games')
      .update({
        doubling_cube: game.doublingCube,
        status: game.status,
        winner: game.winner,
        score: game.score,
        updated_at: new Date()
      })
      .eq('id', gameId)

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        data: {
          accepted: accept,
          gameStatus: game.status,
          winner: game.winner,
          score: game.score
        }
      })
    }
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: error.message })
    }
  }
}

// AI move logic
async function makeAIMove(game) {
  // Simple AI logic - can be enhanced later
  if (game.moves.length > 0) {
    const randomMove = game.moves[Math.floor(Math.random() * game.moves.length)]
    const result = game.makeMove(randomMove)

    // Update database for AI move
    await supabase
      .from('games')
      .update({
        board_state: JSON.stringify(game.board),
        current_player: game.currentPlayer,
        status: game.status,
        winner: game.winner,
        score_white: game.score.white,
        score_black: game.score.black,
        dice: game.dice,
        updated_at: new Date()
      })
      .eq('id', game.gameId)

    return {
      ...result,
      gnubgNotation: game.moveToGNUBGNotation(result)
    }
  }
  return null
}

// Health check
async function healthCheck(event) {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeGames: activeGames.size,
      uptime: process.uptime(),
      environment: 'production'
    })
  }
}
