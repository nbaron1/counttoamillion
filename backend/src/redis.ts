import { createClient } from 'redis';
import { config } from './config';

export const pubClient = createClient({
  url: config.redisURL,
});

pubClient.on('error', (error) => {
  console.log('Redis publisher error: ', error);
});

pubClient.connect();

export const subClient = createClient({
  url: config.redisURL,
});

subClient.on('error', (error) => {
  console.log('Redis subscriber error: ', error);
});

subClient.connect();
