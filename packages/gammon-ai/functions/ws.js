// WebSocket Test Function for Netlify
// Note: Netlify has limited WebSocket support. This works in development/server mode.

exports.handler = async (event, context) => {
  // WebSocket upgrade headers for Netlify
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Upgrade, Connection',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Upgrade': 'websocket',
    'Connection': 'Upgrade',
    'Sec-WebSocket-Accept': event.headers['sec-websocket-key'] ?
      require('crypto').createHash('sha1')
        .update(event.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64') : '',
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'WebSocket endpoint - Use traditional server deployment for full WebSocket support',
      note: 'Netlify has limited WebSocket support. For full real-time multiplayer, deploy to Heroku, Railway, or similar.',
      websocketUrl: process.env.NODE_ENV === 'development' ?
        `ws://localhost:3000?token=${event.queryStringParameters?.token || 'your-jwt-token'}` :
        'WebSocket not supported on Netlify - use server deployment',
      documentation: 'See README.md for deployment options'
    })
  };
};
