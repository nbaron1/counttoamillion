import { createClient } from 'redis';
import { config } from './config';

const redis = createClient({ url: config.redisURL }).on('error', (err) =>
  console.log('Redis Client Error', err)
);

redis
  .connect()
  .then(() => {
    console.log('Redis connected');
  })
  .catch((err) => {
    console.error('Redis connection failed', err);
  });

export { redis };
