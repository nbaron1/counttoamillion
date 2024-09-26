import { createClient } from 'redis';
import { config } from './config';

export const redisClient = createClient({
  url: config.redisURL,
});

redisClient.on('error', (error) => {
  console.log('Redis client error: ', error);
});

redisClient.connect();

export const redisSubscriber = createClient({
  url: config.redisURL,
});

redisSubscriber.on('error', (error) => {
  console.log('Redis subscriber error: ', error);
});

redisSubscriber.connect();
