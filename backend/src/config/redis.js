const { createClient } = require('redis');
const logger = require('@utils/logger');

let redisClient;
let redisDisabled = false;

function isRedisRequired() {
  return process.env.REDIS_REQUIRED === 'true';
}

function isRedisEnabled() {
  return Boolean(process.env.REDIS_URL) && process.env.REDIS_ENABLED !== 'false' && !redisDisabled;
}

function getRedisClient() {
  if (!isRedisEnabled()) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
        reconnectStrategy: isRedisRequired()
          ? undefined
          : function noReconnect() {
              return false;
            }
      }
    });

    redisClient.on('error', function onError(error) {
      const level = isRedisRequired() ? 'error' : 'warn';
      logger[level]('Redis client error', { error: error.message });
    });
  }

  return redisClient;
}

async function connectRedis() {
  const client = getRedisClient();

  if (!client) {
    logger.warn('Redis disabled; continuing without Redis connection');
    return null;
  }

  try {
    if (!client.isOpen) {
      await client.connect();
      logger.info('Redis connection established');
    }

    return client;
  } catch (error) {
    if (isRedisRequired()) {
      throw error;
    }

    redisDisabled = true;
    redisClient = null;
    logger.warn('Redis unavailable; continuing without Redis-backed features', {
      error: error.message
    });
    return null;
  }
}

module.exports = {
  connectRedis,
  getRedisClient
};
