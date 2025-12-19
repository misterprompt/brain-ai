// Comprehensive System Test Suite for GammonGuru
// Run with: node test-system-comprehensive.js

const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

let authToken = null;
let gameId = null;
let wsConnection = null;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'info' ? 'ℹ️' : '🔄';
  console.log(`${emoji} [${timestamp}] ${message}`);
}

function assert(condition, message) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    log(message, 'success');
    return true;
  } else {
    testResults.failed++;
    log(message, 'error');
    return false;
  }
}

async function testHealthCheck() {
  log('Testing server health check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    assert(response.status === 200, 'Health check endpoint responds');
    assert(response.data.status === 'healthy', 'Server reports healthy status');
    assert(response.data.database?.connected === true, 'Database connection confirmed');
    assert(response.data.websocket, 'WebSocket stats available');
    assert(response.data.security?.rateLimiting === 'active', 'Security features active');
    return true;
  } catch (error) {
    assert(false, `Health check failed: ${error.message}`);
    return false;
  }
}

async function testUserRegistration() {
  log('Testing user registration...');
  try {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Test User'
    };

    const response = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    assert(response.status === 201 || response.status === 200, 'Registration endpoint responds');
    assert(response.data.success === true, 'Registration successful');

    // Store the user info for login test
    testUser.id = response.data.user?.id;
    return testUser;
  } catch (error) {
    assert(false, `Registration failed: ${error.message}`);
    return null;
  }
}

async function testUserLogin(testUser) {
  log('Testing user login...');
  try {
    const loginData = {
      email: testUser.email,
      password: testUser.password
    };

    const response = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
    assert(response.status === 200, 'Login endpoint responds');
    assert(response.data.success === true, 'Login successful');
    assert(response.data.token, 'JWT token received');

    authToken = response.data.token;
    log(`JWT Token received: ${authToken.substring(0, 20)}...`, 'success');
    return true;
  } catch (error) {
    assert(false, `Login failed: ${error.message}`);
    return false;
  }
}

async function testGameCreation() {
  log('Testing game creation...');
  try {
    const gameData = {
      gameMode: 'AI_VS_PLAYER',
      opponentType: 'ai',
      difficulty: 'intermediate'
    };

    const response = await axios.post(`${BASE_URL}/api/games`, gameData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert(response.status === 201, 'Game creation endpoint responds');
    assert(response.data.success === true, 'Game created successfully');
    assert(response.data.data?.game?.id, 'Game ID returned');

    gameId = response.data.data.game.id;
    log(`Game created with ID: ${gameId}`, 'success');
    return true;
  } catch (error) {
    assert(false, `Game creation failed: ${error.message}`);
    return false;
  }
}

async function testDiceRolling() {
  log('Testing dice rolling...');
  try {
    const response = await axios.post(`${BASE_URL}/api/games/${gameId}/roll`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert(response.status === 200, 'Dice roll endpoint responds');
    assert(response.data.success === true, 'Dice rolled successfully');
    assert(Array.isArray(response.data.data?.dice), 'Dice values returned');
    assert(response.data.data.dice.length === 2, 'Two dice rolled');
    assert(response.data.data.dice.every(d => d >= 1 && d <= 6), 'Valid dice values');

    log(`Dice rolled: ${response.data.data.dice.join(', ')}`, 'success');
    return response.data.data.dice;
  } catch (error) {
    assert(false, `Dice rolling failed: ${error.message}`);
    return null;
  }
}

async function testAvailableMoves() {
  log('Testing available moves retrieval...');
  try {
    const response = await axios.get(`${BASE_URL}/api/games/${gameId}/moves`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert(response.status === 200, 'Available moves endpoint responds');
    assert(response.data.success === true, 'Moves retrieved successfully');
    assert(Array.isArray(response.data.data?.availableMoves), 'Moves array returned');

    log(`Available moves: ${response.data.data.availableMoves.length}`, 'success');
    return response.data.data.availableMoves;
  } catch (error) {
    assert(false, `Available moves failed: ${error.message}`);
    return [];
  }
}

async function testWebSocketConnection() {
  log('Testing WebSocket connection...');
  return new Promise((resolve) => {
    try {
      wsConnection = new WebSocket(`${WS_URL}?token=${authToken}`);

      wsConnection.onopen = () => {
        assert(true, 'WebSocket connection established');
        log('WebSocket connected successfully', 'success');
      };

      wsConnection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          assert(message.type === 'CONNECTED', 'WebSocket welcome message received');
          log(`WebSocket message received: ${message.type}`, 'success');

          // Test ping
          wsConnection.send(JSON.stringify({ type: 'PING' }));
        } catch (error) {
          assert(false, `WebSocket message parsing failed: ${error.message}`);
        }
      };

      wsConnection.onerror = (error) => {
        assert(false, `WebSocket error: ${error.message}`);
        resolve(false);
      };

      wsConnection.onclose = (event) => {
        log(`WebSocket closed: ${event.code}`, 'info');
      };

      // Timeout for connection test
      setTimeout(() => {
        if (wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.close();
          resolve(true);
        } else {
          assert(false, 'WebSocket connection timeout');
          resolve(false);
        }
      }, 5000);

    } catch (error) {
      assert(false, `WebSocket connection failed: ${error.message}`);
      resolve(false);
    }
  });
}

async function testMatchmaking() {
  log('Testing matchmaking system...');
  return new Promise((resolve) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      assert(false, 'WebSocket not connected for matchmaking test');
      resolve(false);
      return;
    }

    let matchmakingResult = false;

    wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'SEARCHING_OPPONENT') {
          assert(true, 'Matchmaking search initiated');
          log('Opponent search started', 'success');
        } else if (message.type === 'GAME_FOUND') {
          assert(true, 'Match found successfully');
          assert(message.payload?.gameId, 'Game ID provided');
          assert(message.payload?.opponent, 'Opponent info provided');
          log(`Match found! Game: ${message.payload.gameId}, Opponent: ${message.payload.opponent}`, 'success');
          matchmakingResult = true;
          wsConnection.close();
          resolve(true);
        }
      } catch (error) {
        assert(false, `Matchmaking message error: ${error.message}`);
      }
    };

    // Start matchmaking
    wsConnection.send(JSON.stringify({
      type: 'FIND_OPPONENT',
      payload: { preferences: {} }
    }));

    // Timeout for matchmaking test
    setTimeout(() => {
      if (!matchmakingResult) {
        assert(false, 'Matchmaking timeout - no opponent found');
        wsConnection.close();
        resolve(false);
      }
    }, 10000);
  });
}

async function testGNUBGAnalysis() {
  log('Testing GNUBG AI analysis...');
  try {
    // Create a simple backgammon position for analysis
    const analysisData = {
      board: [2, 0, 0, 0, 0, -5, 0, -3, 0, 0, 0, 5, -5, 0, 0, 0, 3, 0, 5, 0, 0, 0, 0, -2], // Starting position
      dice: [3, 2],
      player: 'white'
    };

    const response = await axios.post(`${BASE_URL}/api/gnubg/analyze`, analysisData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert(response.status === 200, 'GNUBG analysis endpoint responds');
    assert(response.data.success === true, 'Analysis completed successfully');
    assert(response.data.data?.analysis, 'Analysis data returned');

    log('GNUBG analysis completed successfully', 'success');
    return true;
  } catch (error) {
    assert(false, `GNUBG analysis failed: ${error.message}`);
    return false;
  }
}

async function testLearningSystem() {
  log('Testing learning system...');
  try {
    const response = await axios.get(`${BASE_URL}/api/learn/rules`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert(response.status === 200, 'Learning rules endpoint responds');
    assert(response.data.success === true, 'Rules retrieved successfully');
    assert(Array.isArray(response.data.data?.rules), 'Rules array returned');
    assert(response.data.data.rules.length > 0, 'Rules available');

    log(`Learning system working - ${response.data.data.rules.length} rules available`, 'success');
    return true;
  } catch (error) {
    assert(false, `Learning system failed: ${error.message}`);
    return false;
  }
}

async function testImageGeneration() {
  log('Testing dynamic image generation...');
  try {
    const response = await axios.get(`${BASE_URL}/api/images?type=board&gameId=${gameId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      responseType: 'arraybuffer'
    });

    assert(response.status === 200, 'Image generation endpoint responds');
    assert(response.headers['content-type'] === 'image/png', 'PNG image returned');
    assert(response.data && response.data.length > 0, 'Image data received');

    log(`Image generated successfully (${response.data.length} bytes)`, 'success');
    return true;
  } catch (error) {
    assert(false, `Image generation failed: ${error.message}`);
    return false;
  }
}

async function testClaudeAI() {
  log('Testing Claude AI coaching...');
  try {
    const coachingData = {
      position: 'White to play 3-2',
      playedMove: '24/21 13/11',
      bestMove: '13/10 13/11',
      analysis: 'The played move was imprecise'
    };

    const response = await axios.post(`${BASE_URL}/api/claude/mistakes`, coachingData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert(response.status === 200, 'Claude AI endpoint responds');
    assert(response.data.success === true, 'AI coaching successful');
    assert(response.data.data?.feedback, 'Coaching feedback provided');

    log('Claude AI coaching working', 'success');
    return true;
  } catch (error) {
    assert(false, `Claude AI failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('🚀 STARTING COMPREHENSIVE SYSTEM TEST SUITE', 'info');
  log('='.repeat(60), 'info');

  // Phase 1: Foundation Tests
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    log('❌ Server not healthy - stopping tests', 'error');
    return;
  }

  // Phase 2: Authentication Tests
  const testUser = await testUserRegistration();
  if (!testUser) {
    log('❌ Registration failed - stopping tests', 'error');
    return;
  }

  const loginOk = await testUserLogin(testUser);
  if (!loginOk) {
    log('❌ Login failed - stopping tests', 'error');
    return;
  }

  // Phase 3: Game Engine Tests
  const gameCreated = await testGameCreation();
  if (gameCreated) {
    await testDiceRolling();
    await testAvailableMoves();
  }

  // Phase 4: WebSocket Tests
  const wsConnected = await testWebSocketConnection();
  if (wsConnected) {
    await testMatchmaking();
  }

  // Phase 5: AI & Analysis Tests
  await testGNUBGAnalysis();
  await testClaudeAI();

  // Phase 6: Feature Tests
  await testLearningSystem();
  await testImageGeneration();

  // Final Results
  log('='.repeat(60), 'info');
  log('🏁 COMPREHENSIVE SYSTEM TEST COMPLETED', 'info');
  log(`Total Tests: ${testResults.total}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');

  if (testResults.failed === 0) {
    log('🎉 ALL TESTS PASSED - SYSTEM IS PRODUCTION READY!', 'success');
    log('🚀 GammonGuru is ready for world domination!', 'success');
  } else {
    log(`⚠️ ${testResults.failed} tests failed - review and fix issues`, 'error');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Test suite interrupted by user', 'info');
  if (wsConnection) {
    wsConnection.close();
  }
  process.exit(0);
});

// Run the tests
runAllTests().catch(error => {
  log(`Test suite failed: ${error.message}`, 'error');
  process.exit(1);
});
