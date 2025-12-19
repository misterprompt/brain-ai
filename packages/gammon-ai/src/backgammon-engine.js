// Complete Backgammon Game Engine
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Backgammon Game Engine Class
class BackgammonGame {
  constructor(gameId, whitePlayer, blackPlayer) {
    this.gameId = gameId
    this.whitePlayer = whitePlayer
    this.blackPlayer = blackPlayer
    this.currentPlayer = 'white'
    this.status = 'WAITING' // WAITING, PLAYING, COMPLETED
    this.winner = null
    this.score = { white: 0, black: 0 }

    // Game state
    this.board = this.initializeBoard()
    this.dice = []
    this.diceUsed = []
    this.moves = []
    this.moveHistory = []
    this.doublingCube = {
      value: 1,
      owner: null, // 'white', 'black', or null
      centered: true
    }

    // Match settings
    this.matchLength = 1 // Points to win match
    this.crawfordRule = true // Crawford rule enabled
    this.jacobyRule = false // Jacoby rule disabled

    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  // Initialize standard backgammon board
  initializeBoard() {
    return {
      // Points 1-24 (1 is white's home board, 24 is black's home board)
      points: Array(24).fill().map(() => ({ white: 0, black: 0 })),

      // Bar (pieces hit)
      bar: { white: 0, black: 0 },

      // Home (bear off area)
      home: { white: 0, black: 0 }
    }
  }

  // Set up initial board position
  setupInitialPosition() {
    // White pieces
    this.board.points[0].white = 2   // Point 1
    this.board.points[11].white = 5  // Point 12
    this.board.points[16].white = 3  // Point 17
    this.board.points[18].white = 5  // Point 19

    // Black pieces
    this.board.points[4].black = 2   // Point 5
    this.board.points[6].black = 5   // Point 7
    this.board.points[12].black = 5  // Point 13
    this.board.points[23].black = 2  // Point 24

    this.status = 'PLAYING'
    this.updatedAt = new Date()
  }

  // Roll dice for current player
  rollDice() {
    if (this.status !== 'PLAYING') {
      throw new Error('Game is not in playing state')
    }

    const die1 = Math.floor(Math.random() * 6) + 1
    const die2 = Math.floor(Math.random() * 6) + 1

    if (die1 === die2) {
      // Doubles - 4 moves of the same number
      this.dice = [die1, die1, die1, die1]
    } else {
      this.dice = [die1, die2]
    }

    this.diceUsed = []
    this.moves = []

    // Check for possible moves
    this.calculateAvailableMoves()

    this.updatedAt = new Date()
    return this.dice
  }

  // Calculate all legal moves for current player
  calculateAvailableMoves() {
    if (this.dice.length === 0) return

    this.moves = []

    // Get all possible moves considering backgammon rules
    const possibleMoves = this.getAllPossibleMoves()

    // Filter to legal moves only
    this.moves = possibleMoves.filter(move => this.isMoveLegal(move))
  }

  // Get all theoretically possible moves
  getAllPossibleMoves() {
    const player = this.currentPlayer
    const direction = player === 'white' ? 1 : -1
    const possibleMoves = []

    // Get all pieces that can move
    const movablePieces = this.getMovablePieces(player)

    // Generate all possible single moves
    for (const piece of movablePieces) {
      for (const die of this.dice) {
        if (!this.diceUsed.includes(die)) {
          const targetPoint = piece.point + (die * direction)

          // Check if move is within board bounds
          if (this.isValidTargetPoint(targetPoint, player)) {
            possibleMoves.push({
              from: piece.point,
              to: targetPoint,
              die: die,
              player: player,
              type: this.getMoveType(targetPoint, player)
            })
          }
        }
      }
    }

    return possibleMoves
  }

  // Get pieces that can potentially move
  getMovablePieces(player) {
    const pieces = []

    // Check bar first (must move from bar if pieces are there)
    const barCount = this.board.bar[player]
    if (barCount > 0) {
      const entryPoint = player === 'white' ? 0 : 23 // Points 1 and 24
      pieces.push({ point: 'bar', count: barCount, entryPoint: entryPoint })
      return pieces // Must move from bar first
    }

    // Check all points for player's pieces
    for (let i = 0; i < 24; i++) {
      const count = this.board.points[i][player]
      if (count > 0) {
        pieces.push({ point: i, count: count })
      }
    }

    return pieces
  }

  // Check if target point is valid
  isValidTargetPoint(targetPoint, player) {
    // Bearing off
    if (this.canBearOff(player)) {
      if (player === 'white' && targetPoint >= 24) return true
      if (player === 'black' && targetPoint <= -1) return true
    }

    // Normal move within board
    if (targetPoint >= 0 && targetPoint < 24) {
      // Check if point is blocked (2+ opponent pieces)
      const opponent = player === 'white' ? 'black' : 'white'
      return this.board.points[targetPoint][opponent] < 2
    }

    return false
  }

  // Get move type (normal, hit, bear off)
  getMoveType(targetPoint, player) {
    // Bearing off
    if ((player === 'white' && targetPoint >= 24) ||
        (player === 'black' && targetPoint <= -1)) {
      return 'bear_off'
    }

    // Check if hitting opponent
    const opponent = player === 'white' ? 'black' : 'white'
    if (this.board.points[targetPoint][opponent] === 1) {
      return 'hit'
    }

    return 'normal'
  }

  // Check if move is legal considering all rules
  isMoveLegal(move) {
    try {
      // Simulate the move
      const tempGame = this.clone()

      if (move.from === 'bar') {
        // Moving from bar
        tempGame.board.bar[tempGame.currentPlayer]--
        if (move.type === 'hit') {
          // Hit opponent piece
          const opponent = tempGame.currentPlayer === 'white' ? 'black' : 'white'
          tempGame.board.points[move.to][opponent]--
          tempGame.board.bar[opponent]++
        }
        tempGame.board.points[move.to][tempGame.currentPlayer]++
      } else {
        // Normal move
        tempGame.board.points[move.from][tempGame.currentPlayer]--
        if (move.type === 'hit') {
          // Hit opponent piece
          const opponent = tempGame.currentPlayer === 'white' ? 'black' : 'white'
          tempGame.board.points[move.to][opponent]--
          tempGame.board.bar[opponent]++
        } else if (move.type === 'bear_off') {
          // Bearing off
          tempGame.board.home[tempGame.currentPlayer]++
        } else {
          // Normal move
          tempGame.board.points[move.to][tempGame.currentPlayer]++
        }
      }

      return true
    } catch (error) {
      return false
    }
  }

  // Make a move
  makeMove(move) {
    if (this.status !== 'PLAYING') {
      throw new Error('Game is not in playing state')
    }

    if (!this.moves.find(m => m.from === move.from && m.to === move.to)) {
      throw new Error('Illegal move')
    }

    // Execute the move
    if (move.from === 'bar') {
      this.board.bar[this.currentPlayer]--
    } else {
      this.board.points[move.from][this.currentPlayer]--
    }

    if (move.type === 'hit') {
      const opponent = this.currentPlayer === 'white' ? 'black' : 'white'
      this.board.points[move.to][opponent]--
      this.board.bar[opponent]++
    } else if (move.type === 'bear_off') {
      this.board.home[this.currentPlayer]++
    } else {
      this.board.points[move.to][this.currentPlayer]++
    }

    // Mark die as used
    this.diceUsed.push(move.die)

    // Remove used die from available dice
    const dieIndex = this.dice.indexOf(move.die)
    if (dieIndex > -1) {
      this.dice.splice(dieIndex, 1)
    }

    // Record move
    this.moveHistory.push({
      ...move,
      timestamp: new Date(),
      boardState: JSON.stringify(this.board)
    })

    // Check for game end
    if (this.checkGameEnd()) {
      this.status = 'COMPLETED'
      this.winner = this.currentPlayer
      this.score[this.currentPlayer]++
    } else {
      // Switch players if no more moves available
      if (this.dice.length === 0) {
        this.switchPlayer()
      }
    }

    this.updatedAt = new Date()
    return move
  }

  // Check if game has ended
  checkGameEnd() {
    return this.board.home[this.currentPlayer] === 15
  }

  // Check if player can bear off
  canBearOff(player) {
    // All pieces must be in home board
    const homeStart = player === 'white' ? 18 : 0  // Points 19-24 for white, 1-6 for black
    const homeEnd = player === 'white' ? 23 : 5

    for (let i = 0; i < 24; i++) {
      if (this.board.points[i][player] > 0) {
        if (i < homeStart || i > homeEnd) {
          return false
        }
      }
    }

    // No pieces on bar
    if (this.board.bar[player] > 0) {
      return false
    }

    return true
  }

  // Calculate pip count
  calculatePipCount(player) {
    let pipCount = 0

    // Pieces on bar (25 pips to enter)
    pipCount += this.board.bar[player] * 25

    // Pieces on board
    for (let i = 0; i < 24; i++) {
      const count = this.board.points[i][player]
      if (count > 0) {
        const distance = player === 'white' ? (23 - i) : i
        pipCount += count * distance
      }
    }

    return pipCount
  }

  // Switch to other player
  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white'
    this.dice = []
    this.diceUsed = []
    this.moves = []
  }

  // Clone game state (for move validation)
  clone() {
    const cloned = new BackgammonGame(this.gameId, this.whitePlayer, this.blackPlayer)
    cloned.board = JSON.parse(JSON.stringify(this.board))
    cloned.currentPlayer = this.currentPlayer
    cloned.status = this.status
    cloned.dice = [...this.dice]
    cloned.diceUsed = [...this.diceUsed]
    cloned.moves = [...this.moves]
    cloned.doublingCube = { ...this.doublingCube }
    return cloned
  }

  // Convert internal point (0-23) to GNUBG point (1-24)
  pointToGNUBG(point) {
    return point + 1
  }

  // Convert GNUBG point (1-24) to internal point (0-23)
  gnubgToPoint(gnubgPoint) {
    return gnubgPoint - 1
  }

  // Convert move to GNUBG notation
  moveToGNUBGNotation(move) {
    let fromNotation, toNotation

    // Convert from point
    if (move.from === 'bar') {
      fromNotation = 'bar'
    } else {
      fromNotation = this.pointToGNUBG(move.from).toString()
    }

    // Convert to point
    if (move.type === 'bear_off') {
      toNotation = 'off'
    } else {
      toNotation = this.pointToGNUBG(move.to).toString()
    }

    // Add hit indicator
    const hitIndicator = move.type === 'hit' ? '*' : ''

    return `${fromNotation}/${toNotation}${hitIndicator}`
  }

  // Parse GNUBG notation to internal move
  parseGNUBGNotation(notation, player) {
    const parts = notation.replace('*', '').split('/')
    let from, to

    // Parse from point
    if (parts[0] === 'bar') {
      from = 'bar'
    } else {
      from = this.gnubgToPoint(parseInt(parts[0]))
    }

    // Parse to point
    if (parts[1] === 'off') {
      // Bearing off - calculate target based on player
      const die = player === 'white' ?
        (from === 'bar' ? 24 : from) - parseInt(parts[0] === 'bar' ? '25' : parts[0]) :
        parseInt(parts[0] === 'bar' ? '0' : parts[0]) + parseInt(parts[0] === 'bar' ? '25' : parts[0])
      to = die
    } else {
      to = this.gnubgToPoint(parseInt(parts[1]))
    }

    return {
      from,
      to,
      notation: notation,
      player: player
    }
  }

  // Get game state for API response
  getGameState() {
    return {
      gameId: this.gameId,
      whitePlayer: this.whitePlayer,
      blackPlayer: this.blackPlayer,
      currentPlayer: this.currentPlayer,
      status: this.status,
      winner: this.winner,
      score: this.score,
      board: this.board,
      dice: this.dice,
      diceUsed: this.diceUsed,
      availableMoves: this.moves.map(move => ({
        ...move,
        gnubgNotation: this.moveToGNUBGNotation(move)
      })),
      doublingCube: this.doublingCube,
      pipCount: {
        white: this.calculatePipCount('white'),
        black: this.calculatePipCount('black')
      },
      canDouble: this.canDouble(),
      canBearOff: this.canBearOff(this.currentPlayer),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  // Check if current player can double
  canDouble() {
    // Can't double if cube is not centered
    if (!this.doublingCube.centered) return false

    // Can't double if opponent owns cube
    if (this.doublingCube.owner && this.doublingCube.owner !== this.currentPlayer) return false

    // Can't double in Crawford game if player is Crawford
    if (this.crawfordRule && this.isCrawfordGame()) return false

    return true
  }

  // Check if this is a Crawford game
  isCrawfordGame() {
    const whitePoints = Math.max(0, this.matchLength - this.score.white - 1)
    const blackPoints = Math.max(0, this.matchLength - this.score.black - 1)

    return whitePoints === 1 || blackPoints === 1
  }

  // Double the cube
  doubleCube() {
    if (!this.canDouble()) {
      throw new Error('Cannot double at this time')
    }

    this.doublingCube.value *= 2
    this.doublingCube.owner = this.currentPlayer === 'white' ? 'black' : 'white'
    this.doublingCube.centered = false

    // Switch player (doubling doesn't count as a move)
    this.switchPlayer()

    this.updatedAt = new Date()
  }

  // Accept or decline double
  respondToDouble(accept) {
    if (this.doublingCube.centered || !this.doublingCube.owner) {
      throw new Error('No pending double to respond to')
    }

    if (accept) {
      // Accept double - game continues with new cube value
      this.doublingCube.centered = true
    } else {
      // Decline double - current player wins
      this.winner = this.currentPlayer
      this.status = 'COMPLETED'
      this.score[this.currentPlayer] += this.doublingCube.value
    }

    this.updatedAt = new Date()
  }
}

// Export the game engine
module.exports = { BackgammonGame }
