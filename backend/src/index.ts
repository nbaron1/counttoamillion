import express from 'express';
import { config } from './config';
import expressWs from 'express-ws';
import { type WebSocket } from 'ws';
import { redis } from './redis';
import { db } from './db';
import cors from 'cors';

const app = expressWs(express()).app;
app.use(
  cors({ origin: ['http://localhost:3000', 'https://countinorder.com'] })
);

const PAGE_SIZE = 50;

app.get('/v1/attempts', async (req, res) => {
  const filter = req.query.filter ?? 'latest';

  const page = req.query.page ? Number(req.query.page) : 1;

  if (filter !== 'latest' && filter !== 'top') {
    res.status(400).send('Invalid filter');
    return;
  }

  try {
    const attempts = new Attempts();

    const rows = await attempts.getRows({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      filter,
    });

    const numberOfRows = await new Attempts().getCount();

    const hasNextPage = numberOfRows > page * PAGE_SIZE;

    res.status(200).send({ data: rows, success: true, hasNextPage });
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

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

  async addAttempt(count: number) {
    await db.query('INSERT INTO attempt (count) VALUES ($1)', [count]);
  }

  async getCount() {
    const numberOfRowsResult = await db.query(
      'SELECT COUNT(*) AS count FROM attempt'
    );

    return Number(numberOfRowsResult.rows[0].count);
  }

  async getRows({
    limit,
    offset,
    filter,
  }: {
    offset: number;
    limit: number;
    filter: 'latest' | 'top';
  }) {
    if (filter === 'latest') {
      const query = await db.query(
        'SELECT * FROM attempt ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );

      return query.rows;
    }

    const query = await db.query(
      'SELECT * FROM attempt ORDER BY count DESC, created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return query.rows;
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

let connections: WebSocket[] = [];

app.ws('/v1/websocket', (ws) => {
  console.log('Connected!');
  connections.push(ws);

  connections.forEach((connection) => {
    try {
      connection.send(
        JSON.stringify({ type: 'user-count', value: connections.length })
      );
    } catch (error) {
      console.error('Error sending message to client', error);
    }
  });

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

            await new Attempts().addAttempt(currentCount);

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

  ws.on('close', (cls) => {
    connections = connections.filter((connection) => connection !== ws);

    connections.forEach((connection) => {
      try {
        connection.send(
          JSON.stringify({ type: 'user-count', value: connections.length })
        );
      } catch (error) {
        console.error('Error sending message to client', error);
      }
    });
  });
});

app.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`);
});
