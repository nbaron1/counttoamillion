import { createClient } from 'redis';
import { config } from './config';

export const redisClient = createClient({
  url: config.redisURL,
});

redisClient.on('error', (error) => {
  console.log('Redis publisher error: ', error);
});

redisClient.connect();
