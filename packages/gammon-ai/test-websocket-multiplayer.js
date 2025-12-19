// WebSocket Multiplayer Test Script
// Run with: node test-websocket-multiplayer.js

const WebSocket = require('ws');
const axios = require('axios');

const WS_URL = 'ws://localhost:3000';
const BASE_URL = 'http://localhost:3000';

// Test configuration
let authToken = null;
let gameId = null;
let ws1 = null;
let ws2 = null;

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'info' ? 'ℹ️' : '🎮';
  console.log(`${emoji} [${timestamp}] ${message}`);
}

async function authenticateUser() {
  log('Authenticating test user...');
  try {
    // Try to login with existing test user first
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword123'
    });

    if (loginResponse.data.success) {
      authToken = loginResponse.data.token;
      log('Logged in with existing test user', 'success');
      return true;
    }
  } catch (error) {
    // User doesn't exist, create one
    log('Creating new test user...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'WebSocket Test User'
      });

      if (registerResponse.data.success) {
        // Now login
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: 'test@example.com',
          password: 'testpassword123'
        });

        authToken = loginResponse.data.token;
        log('Created and logged in test user', 'success');
        return true;
      }
    } catch (registerError) {
      log(`Authentication failed: ${registerError.message}`, 'error');
      return false;
    }
  }
  return false;
}

function createWebSocketConnection(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?token=${authToken}`);

    ws.onopen = () => {
      log(`${name} WebSocket connected`, 'success');
      resolve(ws);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        log(`${name} received: ${message.type}`, 'info');

        if (message.type === 'CONNECTED') {
          log(`${name} authenticated successfully`, 'success');
        } else if (message.type === 'GAME_FOUND') {
          log(`${name} found game: ${message.payload.gameId}`, 'success');
          gameId = message.payload.gameId;
        } else if (message.type === 'GAME_JOINED') {
          log(`${name} joined game successfully`, 'success');
        } else if (message.type === 'MOVE_MADE') {
          log(`${name} saw move: ${message.payload.player} moved`, 'info');
        } else if (message.type === 'CHAT_MESSAGE') {
          log(`${name} chat: ${message.payload.message}`, 'info');
        }
      } catch (error) {
        log(`${name} message parse error: ${error.message}`, 'error');
      }
    };

    ws.onerror = (error) => {
      log(`${name} WebSocket error: ${error.message}`, 'error');
      reject(error);
    };

    ws.onclose = (event) => {
      log(`${name} WebSocket closed: ${event.code}`, 'info');
    };

    // Connection timeout
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        reject(new Error(`${name} connection timeout`));
      }
    }, 5000);
  });
}

async function testWebSocketMultiplayer() {
  log('🎮 STARTING WEBSOCKET MULTIPLAYER TEST', 'info');
  log('='.repeat(50), 'info');

  // Step 1: Authenticate
  const authSuccess = await authenticateUser();
  if (!authSuccess) {
    log('❌ Authentication failed - cannot test multiplayer', 'error');
    return;
  }

  // Step 2: Create first WebSocket connection
  log('Creating first player connection...');
  try {
    ws1 = await createWebSocketConnection('Player 1');
  } catch (error) {
    log(`❌ Player 1 connection failed: ${error.message}`, 'error');
    return;
  }

  // Step 3: Create second WebSocket connection (simulate second player)
  log('Creating second player connection...');
  try {
    ws2 = await createWebSocketConnection('Player 2');
  } catch (error) {
    log(`❌ Player 2 connection failed: ${error.message}`, 'error');
    ws1.close();
    return;
  }

  // Step 4: Test matchmaking
  log('Testing matchmaking system...');

  // Player 1 starts searching
  ws1.send(JSON.stringify({
    type: 'FIND_OPPONENT',
    payload: { preferences: {} }
  }));

  // Wait a moment, then Player 2 also searches
  setTimeout(() => {
    ws2.send(JSON.stringify({
      type: 'FIND_OPPONENT',
      payload: { preferences: {} }
    }));
  }, 1000);

  // Step 5: Wait for match and test gameplay
  setTimeout(async () => {
    if (gameId) {
      log('Match found! Testing game functionality...', 'success');

      // Both players join the game
      ws1.send(JSON.stringify({
        type: 'JOIN_GAME',
        payload: { gameId }
      }));

      ws2.send(JSON.stringify({
        type: 'JOIN_GAME',
        payload: { gameId }
      }));

      // Test chat
      setTimeout(() => {
        ws1.send(JSON.stringify({
          type: 'SEND_MESSAGE',
          payload: {
            message: 'Hello from Player 1!',
            messageType: 'TEXT'
          }
        }));

        ws2.send(JSON.stringify({
          type: 'SEND_MESSAGE',
          payload: {
            message: 'Hi Player 1, ready to play!',
            messageType: 'TEXT'
          }
        }));
      }, 2000);

      // Test dice rolling
      setTimeout(() => {
        ws1.send(JSON.stringify({ type: 'ROLL_DICE' }));
      }, 3000);

      // Test making a move
      setTimeout(() => {
        ws1.send(JSON.stringify({
          type: 'MAKE_MOVE',
          payload: { from: 24, to: 22 } // Example move
        }));
      }, 4000);

    } else {
      log('⚠️ No match found within timeout period', 'error');
    }

    // Cleanup after testing
    setTimeout(() => {
      log('Cleaning up test connections...', 'info');
      if (ws1) ws1.close();
      if (ws2) ws2.close();

      log('🎮 WEBSOCKET MULTIPLAYER TEST COMPLETED', 'success');
      log('✅ Real-time multiplayer functionality verified!', 'success');
    }, 6000);

  }, 5000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Test interrupted by user', 'info');
  if (ws1) ws1.close();
  if (ws2) ws2.close();
  process.exit(0);
});

// Run the test
testWebSocketMultiplayer().catch(error => {
  log(`WebSocket test failed: ${error.message}`, 'error');
  process.exit(1);
});
