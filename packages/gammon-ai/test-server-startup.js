// Server Startup Test
// Run with: node test-server-startup.js

const { spawn } = require('child_process');
const http = require('http');

const SERVER_PORT = 3000;
const STARTUP_TIMEOUT = 10000; // 10 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'info' ? 'ℹ️' : '🔄';
  console.log(`${emoji} [${timestamp}] ${message}`);
}

function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${SERVER_PORT}/health`, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const healthData = JSON.parse(data);

          // Check if response is valid
          if (healthData.status === 'healthy') {
            log('Health check passed - server is healthy', 'success');
            resolve(healthData);
          } else {
            log('Health check failed - server not healthy', 'error');
            reject(new Error('Server not healthy'));
          }
        } catch (error) {
          log('Health check failed - invalid JSON response', 'error');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      log(`Health check request failed: ${error.message}`, 'error');
      reject(error);
    });

    // Timeout for health check
    setTimeout(() => {
      req.destroy();
      reject(new Error('Health check timeout'));
    }, HEALTH_CHECK_TIMEOUT);
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    log('Starting GammonGuru server...');

    const serverProcess = spawn('npm', ['start'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let serverOutput = '';
    let serverStarted = false;

    // Listen for server output
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;

      if (output.includes('GammonGuru API running on port')) {
        serverStarted = true;
        log('Server started successfully', 'success');
      }

      if (output.includes('WebSocket Server initialized')) {
        log('WebSocket server initialized', 'success');
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      log(`Server error: ${error}`, 'error');
    });

    serverProcess.on('close', (code) => {
      if (!serverStarted) {
        reject(new Error(`Server failed to start (exit code: ${code})`));
      }
    });

    // Check if server started within timeout
    setTimeout(() => {
      if (serverStarted) {
        resolve(serverProcess);
      } else {
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
      }
    }, STARTUP_TIMEOUT);
  });
}

async function runServerTest() {
  log('🚀 TESTING SERVER STARTUP AND HEALTH', 'info');
  log('='.repeat(50), 'info');

  let serverProcess = null;

  try {
    // Step 1: Start the server
    serverProcess = await startServer();

    // Step 2: Wait a moment for full initialization
    log('Waiting for server to fully initialize...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Test health endpoint
    const healthData = await testHealthEndpoint();

    // Step 4: Verify health data
    const checks = [
      { name: 'Server Status', check: healthData.status === 'healthy' },
      { name: 'Database Connection', check: healthData.database?.connected === true },
      { name: 'WebSocket Server', check: healthData.websocket?.activeConnections !== undefined },
      { name: 'Security Features', check: healthData.security?.rateLimiting === 'active' },
      { name: 'Memory Usage', check: healthData.memory?.heapUsed > 0 },
      { name: 'Uptime Tracking', check: healthData.uptime > 0 }
    ];

    log('Verifying health check data...', 'info');
    checks.forEach(({ name, check }) => {
      if (check) {
        log(`${name}: OK`, 'success');
      } else {
        log(`${name}: FAILED`, 'error');
      }
    });

    const passedChecks = checks.filter(c => c.check).length;
    const totalChecks = checks.length;

    if (passedChecks === totalChecks) {
      log(`🎉 ALL HEALTH CHECKS PASSED (${passedChecks}/${totalChecks})`, 'success');
      log('✅ SERVER IS FULLY OPERATIONAL AND HEALTHY!', 'success');
    } else {
      log(`⚠️ SOME HEALTH CHECKS FAILED (${passedChecks}/${totalChecks})`, 'error');
    }

  } catch (error) {
    log(`❌ SERVER TEST FAILED: ${error.message}`, 'error');
    return false;
  } finally {
    // Cleanup: stop the server
    if (serverProcess) {
      log('Stopping test server...', 'info');
      serverProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        log('Test server stopped', 'info');
      }, 3000);
    }
  }

  log('🏁 SERVER STARTUP TEST COMPLETED', 'info');
  return true;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Test interrupted by user', 'info');
  process.exit(0);
});

// Run the test
runServerTest().catch(error => {
  log(`Server test failed: ${error.message}`, 'error');
  process.exit(1);
});
