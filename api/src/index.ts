import express from 'express';
import { config } from './config';
import WebSocket, { WebSocketServer } from 'ws';
import pg from 'pg';
import { createClient } from 'redis';
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World');
});

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

const wss = new WebSocketServer({
  port: config.port,
  path: '/v1/websocket',
});

// use redis queue to send messages to all connected clients

class Counter {
  constructor() {}
  async getCounterValue() {
    const count = await redis.get('counter');

    return count ? parseInt(count) : 1;
  }
  async setCounterValue(value: number) {
    await redis.set('counter', value);
  }
}

class Attempts {
  constructor() {}
  async insertAttempt(value: number) {
    return;
  }
}

class Highscore {
  constructor() {}
  async getHighScore() {
    // get the current score from redis and check with the db for the highest score

    return 1;
  }
  async setHighScore(value: number) {
    return;
  }
}

const counter = new Counter();
const highscore = new Highscore();

const connections: WebSocket[] = [];

wss.on('connection', function connection(ws) {
  connections.push(ws);
  console.log('Connected!');

  ws.on('error', console.error);

  ws.on('message', async function message(data) {
    try {
      const parsedData = JSON.parse(data.toString());

      switch (parsedData.type) {
        case 'initial': {
          const highScore = 1;
          const value = await counter.getCounterValue();
          const userCount = connections.length;

          try {
            ws.send(
              JSON.stringify({ value, type: 'initial', highScore, userCount })
            );
          } catch (error) {
            console.error('Error sending message to client', error);
          }

          return;
        }
        case 'update-count': {
          const currentCount = await counter.getCounterValue();

          if (currentCount + 1 !== parsedData.value) {
            await counter.setCounterValue(1);

            // const query = this.env.DB.prepare(
            //   'INSERT INTO attempt (max_count) VALUES (?)'
            // ).bind(currentCount);
            // await query.run();

            connections.forEach((connection) => {
              try {
                connection.send(
                  JSON.stringify({ type: 'failed', value: parsedData.value })
                );
              } catch (error) {
                console.error('Error sending message to client', error);
              }
            });

            return;
          }

          await counter.setCounterValue(parsedData.value);

          connections.forEach((connection) => {
            try {
              connection.send(
                JSON.stringify({
                  value: parsedData.value,
                  type: 'count-updated',
                })
              );
            } catch (error) {
              console.error('Error sending message to client', error);
            }
          });

          const highScore = await highscore.getHighScore();

          if (parsedData.value > highScore) {
            await highscore.setHighScore(parsedData.value);
          }

          return;
        }
      }
    } catch (error) {
      console.error(error);
    }
  });

  ws.send('something');
});
