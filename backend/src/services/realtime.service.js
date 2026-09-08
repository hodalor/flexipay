const jwt = require('jsonwebtoken');
const logger = require('@utils/logger');

const clients = new Set();

function writeEvent(res, eventName, payload) {
  res.write('event: ' + eventName + '\n');
  res.write('data: ' + JSON.stringify(payload) + '\n\n');
}

function verifyRealtimeToken(token) {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
}

function registerRealtimeClient(res, user) {
  const client = {
    id: Date.now() + '-' + Math.random().toString(16).slice(2),
    user,
    res
  };

  clients.add(client);
  writeEvent(res, 'connected', {
    success: true,
    scopes: ['customers', 'devices', 'loans', 'payments'],
    timestamp: new Date().toISOString()
  });

  const heartbeatId = setInterval(function sendHeartbeat() {
    if (!clients.has(client)) {
      clearInterval(heartbeatId);
      return;
    }

    try {
      writeEvent(res, 'heartbeat', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      clearInterval(heartbeatId);
      clients.delete(client);
    }
  }, 20000);

  return function closeClient() {
    clearInterval(heartbeatId);
    clients.delete(client);
  };
}

function broadcastRealtimeEvent(type, scopes, payload) {
  if (!clients.size) {
    return;
  }

  const message = {
    type,
    scopes,
    payload: payload || {},
    timestamp: new Date().toISOString()
  };

  clients.forEach(function publish(client) {
    try {
      writeEvent(client.res, 'update', message);
    } catch (error) {
      clients.delete(client);
      logger.warn('Realtime client publish failed', {
        error: error.message
      });
    }
  });
}

module.exports = {
  verifyRealtimeToken,
  registerRealtimeClient,
  broadcastRealtimeEvent
};
