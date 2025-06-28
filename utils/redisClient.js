/**
 * Redis client utility for chat application
 * 
 * This file provides Redis functionality for:
 * - Storing online users (socketId → userId mapping)
 * - Handling pub/sub across multiple Node.js instances
 * - Caching frequently accessed data
 * 
 * To use this in production:
 * 1. Install Redis: npm install redis
 * 2. Set REDIS_URL in your .env file
 * 3. Uncomment the code below
 */

const redis = require('redis');
const { promisify } = require('util');

// Create Redis client with fallback for development
const createClient = () => {
  // Check if we're in production and have Redis URL
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    return redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          // Exponential backoff with max 10 second delay
          return Math.min(retries * 100, 10000);
        }
      }
    });
  } else {
    // For development, use mock implementation if Redis is not available
    console.log('Redis URL not found, using mock implementation');
    return null;
  }
};

// Initialize client
let redisClient = createClient();
let getAsync, setAsync, delAsync, expireAsync;

// Set up Redis client if available
if (redisClient) {
  // Handle Redis connection events
  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Connected to Redis');
  });

  // Connect to Redis
  (async () => {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
      redisClient = null;
    }
  })();

  // Promisify Redis commands for async/await usage
  getAsync = async (key) => await redisClient.get(key);
  setAsync = async (key, value) => await redisClient.set(key, value);
  delAsync = async (key) => await redisClient.del(key);
  expireAsync = async (key, seconds) => await redisClient.expire(key, seconds);
}

// User online status management
const userStatusKey = (userId) => `user:status:${userId}`;
const socketToUserKey = (socketId) => `socket:${socketId}`;

// Store user's online status and socket mapping
const setUserOnline = async (userId, socketId) => {
  if (redisClient) {
    await setAsync(userStatusKey(userId), 'online');
    await setAsync(socketToUserKey(socketId), userId);
    // Set expiration for socket mapping (cleanup if connection lost)
    await expireAsync(socketToUserKey(socketId), 86400); // 24 hours
    return true;
  } else {
    console.log(`[Redis Mock] User ${userId} online with socket ${socketId}`);
    return true;
  }
};

// Remove user's online status
const setUserOffline = async (userId) => {
  if (redisClient) {
    await setAsync(userStatusKey(userId), 'offline');
    return true;
  } else {
    console.log(`[Redis Mock] User ${userId} offline`);
    return true;
  }
};

// Get user by socket ID
const getUserBySocket = async (socketId) => {
  if (redisClient) {
    return await getAsync(socketToUserKey(socketId));
  } else {
    console.log(`[Redis Mock] Getting user for socket ${socketId}`);
    return null;
  }
};

// Clean up when socket disconnects
const handleDisconnect = async (socketId) => {
  if (redisClient) {
    const userId = await getUserBySocket(socketId);
    if (userId) {
      await setUserOffline(userId);
      await delAsync(socketToUserKey(socketId));
    }
    return true;
  } else {
    console.log(`[Redis Mock] Handling disconnect for socket ${socketId}`);
    return true;
  }
};

module.exports = {
  redisClient,
  setUserOnline,
  setUserOffline,
  getUserBySocket,
  handleDisconnect
}; 