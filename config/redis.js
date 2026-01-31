/**
 * Redis Configuration for Caching
 */

const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

const connectRedis = async () => {
  // Prevent multiple connection attempts
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn('Redis not available - caching disabled');
            return false; // Stop reconnecting
          }
          return retries * 500;
        }
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      // Only log once, not every retry
      if (!isConnected) {
        logger.warn('Redis connection failed - continuing without cache');
      }
    });

    redisClient.on('connect', () => {
      if (!isConnected) {
        logger.info('Redis Client Connected');
      }
    });

    redisClient.on('ready', () => {
      if (!isConnected) {
        logger.info('Redis Client Ready');
        isConnected = true;
      }
    });

    await redisClient.connect();

    return redisClient;
  } catch (error) {
    logger.warn('Redis not available - app will run without caching');
    // Don't exit - app can work without cache
    return null;
  }
};

const getRedisClient = () => {
  return redisClient;
};

module.exports = {
  connectRedis,
  getRedisClient
};

