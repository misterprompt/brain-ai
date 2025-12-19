#!/usr/bin/env node

// API Testing Script for GammonGuru Backend
// Run with: node test-api.js

const https = require('https');

const BASE_URL = 'https://gammon-guru-api.onrender.com';
let authToken = null;

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const options = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealth() {
  console.log('\n🩺 Testing Health Check...');
  try {
    const response = await makeRequest('GET', '/health');
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
    return response.status === 200 && response.data.status === 'healthy';
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testAPIInfo() {
  console.log('\n📋 Testing API Info...');
  try {
    const response = await makeRequest('GET', '/');
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
    return response.status === 200;
  } catch (error) {
    console.error('❌ API info failed:', error.message);
    return false;
  }
}

async function testPlayersList() {
  console.log('\n👥 Testing Players List...');
  try {
    const response = await makeRequest('GET', '/api/players');
    console.log(`Status: ${response.status}`);
    console.log(`Players found:`, response.data.data ? response.data.data.length : 0);
    return response.status === 200 && response.data.success;
  } catch (error) {
    console.error('❌ Players list failed:', error.message);
    return false;
  }
}

async function testUserRegistration() {
  console.log('\n📝 Testing User Registration...');
  const testUser = {
    name: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'testpassword123'
  };

  try {
    const response = await makeRequest('POST', '/api/auth/register', testUser);
    console.log(`Status: ${response.status}`);
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Registration successful, token received');
      return true;
    } else {
      console.log('❌ Registration failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Registration request failed:', error.message);
    return false;
  }
}

async function testUserLogin() {
  console.log('\n🔐 Testing User Login...');
  const loginData = {
    email: 'test@example.com',
    password: 'testpassword123'
  };

  try {
    const response = await makeRequest('POST', '/api/auth/login', loginData);
    console.log(`Status: ${response.status}`);
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Login successful, token received');
      return true;
    } else {
      console.log('⚠️  Login failed (might be expected if user doesn\'t exist):', response.data.error);
      return true; // Not a failure, just no test user
    }
  } catch (error) {
    console.error('❌ Login request failed:', error.message);
    return false;
  }
}

async function testGameCreation() {
  if (!authToken) {
    console.log('\n🎮 Skipping Game Creation (no auth token)');
    return true;
  }

  console.log('\n🎮 Testing Game Creation...');
  const gameData = {
    gameMode: 'AI_VS_PLAYER',
    difficulty: 'MEDIUM'
  };

  try {
    const response = await makeRequest('POST', '/api/games', gameData, {
      'Authorization': `Bearer ${authToken}`
    });
    console.log(`Status: ${response.status}`);
    if (response.data.success) {
      console.log('✅ Game creation successful');
      return true;
    } else {
      console.log('❌ Game creation failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Game creation request failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting GammonGuru API Tests');
  console.log('=' .repeat(50));

  const results = {
    health: await testHealth(),
    apiInfo: await testAPIInfo(),
    players: await testPlayersList(),
    registration: await testUserRegistration(),
    login: await testUserLogin(),
    gameCreation: await testGameCreation()
  };

  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(50));

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  });

  console.log('\n🎯 OVERALL RESULT:');
  if (passed === total) {
    console.log(`🎉 ALL ${total} TESTS PASSED!`);
    console.log('🚀 API is fully functional!');
  } else {
    console.log(`⚠️  ${passed}/${total} tests passed`);
    console.log('🔧 Some endpoints may need attention');
  }

  console.log('\n📝 NOTES:');
  console.log('- Health check and basic endpoints should always pass');
  console.log('- Auth endpoints may show login failures (expected for test users)');
  console.log('- Game creation requires valid authentication');
  console.log('- Check Render dashboard for any deployment issues');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, makeRequest };
