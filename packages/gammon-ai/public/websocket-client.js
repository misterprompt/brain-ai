// WebSocket Client for Real-Time Multiplayer Backgammon
class WebSocketManager {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.messageHandlers = new Map();
    this.gameId = null;
    this.userId = null;
    this.authToken = null;
  }

  // Initialize connection
  connect(userId, authToken, serverUrl = null) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.userId = userId;
    this.authToken = authToken;

    const wsUrl = serverUrl || this.getWebSocketUrl();

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🕸️ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('🕸️ WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.handleReconnection();
        };

        this.ws.onerror = (error) => {
          console.error('🕸️ WebSocket error:', error);
          if (!this.isConnected) {
            reject(error);
          }
        };

        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Get WebSocket URL based on current location
  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}?token=${this.authToken}`;
  }

  // Send message to server
  send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type,
      payload,
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(message));
    console.log('📤 Sent:', message);
  }

  // Register message handler
  on(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  // Remove message handler
  off(messageType) {
    this.messageHandlers.delete(messageType);
  }

  // Handle incoming messages
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received:', message);

      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.payload, message);
      }

      // Emit global event for any listeners
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: message
      }));

    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  // Handle reconnection logic
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(this.userId, this.authToken)
        .then(() => {
          console.log('✅ Reconnected successfully');
          // Rejoin game if we were in one
          if (this.gameId) {
            this.joinGame(this.gameId);
          }
        })
        .catch(error => {
          console.error('Reconnection failed:', error);
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Exponential backoff, max 30s
          this.handleReconnection();
        });
    }, this.reconnectDelay);
  }

  // Game management methods
  joinGame(gameId) {
    this.gameId = gameId;
    this.send('JOIN_GAME', { gameId });
  }

  leaveGame() {
    if (this.gameId) {
      this.send('LEAVE_GAME');
      this.gameId = null;
    }
  }

  makeMove(from, to, gnubgNotation = null) {
    this.send('MAKE_MOVE', { from, to, gnubgNotation });
  }

  rollDice() {
    this.send('ROLL_DICE');
  }

  doubleCube() {
    this.send('DOUBLE_CUBE', { offer: true });
  }

  respondToDouble(accept) {
    this.send('RESPOND_DOUBLE', { accept });
  }

  sendMessage(message, messageType = 'TEXT') {
    this.send('SEND_MESSAGE', { message, messageType });
  }

  findOpponent(preferences = {}) {
    this.send('FIND_OPPONENT', { preferences });
  }

  cancelSearch() {
    this.send('CANCEL_SEARCH');
  }

  // Send ping to keep connection alive
  ping() {
    this.send('PING');
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.gameId = null;
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      gameId: this.gameId,
      readyState: this.ws ? this.ws.readyState : -1,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const websocketManager = new WebSocketManager();

// Auto-ping every 30 seconds to keep connection alive
setInterval(() => {
  if (websocketManager.isConnected) {
    websocketManager.ping();
  }
}, 30000);

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSocketManager;
}

// Export for browser global
if (typeof window !== 'undefined') {
  window.WebSocketManager = WebSocketManager;
  window.websocketManager = websocketManager;
}
