import express from 'express';
import { config } from './config';
import expressWs from 'express-ws';
import { type WebSocket } from 'ws';
import { redis } from './redis';
import { db } from './db';
import cors from 'cors';
import { Client } from 'pg';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { v4 as uuid } from 'uuid';

const app = expressWs(express()).app;

app.use(cors({ origin: [config.frontendHost], credentials: true }));
app.use(express.json());
app.use(cookieParser());

const PAGE_SIZE = 50;

class Session {
  constructor(token: string) {
    this.isValid = token;
  }

  isValid;
}

class SessionToken {
  constructor(private readonly token: string) {}

  isValid() {
    try {
      jwt.verify(this.token, config.jwtTokenSecret);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Make sure to verify before decoding
  decode() {
    try {
      const token = jwt.decode(this.token);

      console.log({ token });

      if (typeof token !== 'string') {
        throw new Error('Invalid token');
      }

      return token;
    } catch (error) {
      return null;
    }
  }
}

app.post('/v1/verify', async (req, res) => {
  try {
    if (!req.body.token) {
      res.status(400).send({ error: 'Missing token', success: false });
      return;
    }

    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    try {
      const result = await fetch(url, {
        body: JSON.stringify({
          secret: config.turnstileSecret,
          response: req.body.token,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      const data = await result.json();

      if (!data.success) {
        res.status(401).send({ error: 'Invalid token', success: false });
        return;
      }

      res.status(200).send({ success: true });
    } catch (error) {
      res.status(401).send({ error: 'Invalid token', success: false });
    }
  } catch (error) {
    res.status(500).send({ error: 'Internal server error', success: false });
  }
});

// app.get('/v1/attempts', async (req, res) => {
//   const filter = req.query.filter ?? 'latest';

//   const page = req.query.page ? Number(req.query.page) : 1;

//   if (filter !== 'latest' && filter !== 'top') {
//     res.status(400).send('Invalid filter');
//     return;
//   }

//   try {
//     const attempts = new Attempts(db);

//     const rows = await attempts.getRows({
//       limit: PAGE_SIZE,
//       offset: (page - 1) * PAGE_SIZE,
//       filter,
//     });

//     const numberOfRows = await new Attempts(db).getCount();

//     const hasNextPage = numberOfRows > page * PAGE_SIZE;

//     res.status(200).send({ data: rows, success: true, hasNextPage });
//   } catch (error) {
//     res.status(500).send({ error: 'Internal server error', success: false });
//   }
// });

app.get('/v1/websocket-token', async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      res.status(403).send({
        error: 'Unauthroized',
        success: false,
      });
      return;
    }

    const isVerified = new SessionToken(token).isValid();

    if (!isVerified) {
      res.sendStatus(403);
      return;
    }

    const userId = new SessionToken(token).decode();

    if (!userId) {
      res.sendStatus(403);
      return;
    }

    const connectionToken = uuid();

    const jwtConnectionToken = jwt.sign(connectionToken, config.jwtTokenSecret);

    await db.query(
      'INSERT INTO websocket_connection_token (id, user_id) VALUES ($1, $2)',
      [jwtConnectionToken, userId]
    );

    res.status(200).json({
      data: {
        token: jwtConnectionToken,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Something went wrong',
    });
  }
});

app.post('/v1/auth', async (req, res) => {
  try {
    const token = req.cookies.token;

    if (token) {
      const decodedSessionToken = jwt.decode(token);

      const searchResult = await db.query(
        'select exists(select 1 from "user" where id = $1) as exists',
        [decodedSessionToken]
      );

      const isValid = searchResult.rows[0].exists;

      // todo: handle issues with db. we don't want to create a new user???
      // we need to make sure the db is still online

      console.log({ isValid });

      if (!isValid) {
        res.sendStatus(500);
        return;
      }

      res.sendStatus(200);
      return;
    }

    const userId = uuid();

    const newUser = await db.query('insert into "user" (id) values ($1)', [
      userId,
    ]);

    const jwtToken = jwt.sign(userId, config.jwtTokenSecret);

    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 10);

    res.cookie('token', jwtToken, {
      secure: true,
      httpOnly: true,
      expires: expirationDate,
    });

    res.sendStatus(200);
  } catch (error) {
    console.log('error', error);

    res.status(500).json({
      success: false,
      error: 'Something went wrong',
    });
  }
});

app.post('/v1/websocket-token', (req, res) => {
  try {
    const token = uuid();

    const jwtToken = jwt.sign(token, config.jwtTokenSecret);

    res.status(200).json({
      success: true,
      data: { token: jwtToken },
    });
  } catch (error) {
    res.sendStatus(500);
  }
});

app.get('/v1/messages', async (req, res) => {
  try {
    const messages = new Messages(db);

    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const rows = await messages.getLatestMessages(limit);

    res.status(200).send({ data: rows, success: true });
  } catch (error) {
    res.status(500).send({ error: 'Internal server error', success: false });
  }
});

class GameStatus {
  constructor(private readonly db: Client) {}

  async getGameStatus() {
    const result = await db.query('SELECT * FROM game_status');
    return result.rows[0];
  }

  async finishGame() {
    await db.query('UPDATE game_status SET finished_at = NOW()');
  }
}

app.get('/v1/game-status', async (req, res) => {
  try {
    const gameStatus = new GameStatus(db);
    const status = await gameStatus.getGameStatus();

    res.status(200).send({ data: status, success: true });
  } catch (error) {
    res.status(500).send({ error: 'Internal server error', success: false });
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
  constructor(private readonly db: Client) {}

  async addAttempt({ count, userId }: { count: number; userId: string }) {
    console.log({ userId });
    await this.db.query(
      'INSERT INTO attempt (count, user_id) VALUES ($1, $2)',
      [count, userId]
    );
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
  async getHighScore() {
    try {
      // get the current score from redis and check with the db for the highest score
      const currentScore = await redis.get('counter');
      const currentScoreInt = currentScore ? parseInt(currentScore) : 1;

      const result = await db.query('SELECT MAX(count) FROM attempt');
      const storedHighesScore = result.rows[0].max;

      return Math.max(currentScoreInt, storedHighesScore);
    } catch (error) {
      // todo: add sentry error logging here
      return 1;
    }
  }
}

class Messages {
  constructor(private readonly db: Client) {}

  async addMessage({ message, author }: { message: string; author: string }) {
    const result = await db.query(
      'INSERT INTO message (message, author) VALUES ($1, $2) RETURNING *',
      [message, author]
    );

    return result.rows[0];
  }

  async getLatestMessages(count: number) {
    const result = await db.query(
      'SELECT * FROM message ORDER BY created_at DESC LIMIT $1',
      [count]
    );

    return result.rows;
  }
}

class Message {
  message: string;
  author: string;
  db: Client;

  constructor({
    author,
    db,
    message,
  }: {
    db: Client;
    message: string;
    author: string;
  }) {
    this.message = message;
    this.author = author;
    this.db = db;
  }

  async isTextHarmful(text: string) {
    const result = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      body: JSON.stringify({
        input: text,
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiKey}`,
      },
    });

    const data = await result.json();
    return data.results[0].flagged;
  }

  async isHarmful(): Promise<boolean | null> {
    try {
      const [isMessageHarmful, isAuthorNameHarmful] = await Promise.all([
        this.isTextHarmful(this.message),
        this.isTextHarmful(this.author),
      ]);

      return isMessageHarmful || isAuthorNameHarmful;
    } catch (error) {
      console.error('Error checking message', error);
      return null;
    }
  }
}

const counter = new Counter();
const highscore = new Highscore();

let connections: WebSocket[] = [];

app.ws('/v1/websocket', (ws, req) => {
  const token = req.cookies.token;

  if (!token) {
    ws.close(1008, 'Unauthorized');
    return;
  }

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
          const highScore = await highscore.getHighScore();
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

            const userId = new SessionToken(token).decode();
            if (!userId) return;

            await new Attempts(db).addAttempt({ count: currentCount, userId });

            try {
              ws.send(
                JSON.stringify({ type: 'failed', value: parsedData.value })
              );
            } catch (error) {
              console.error('Error sending message to client', error);
            }

            return;
          }

          await counter.setCounterValue(parsedData.value);

          ws.send(
            JSON.stringify({
              value: parsedData.value,
              type: 'count-updated',
            })
          );

          return;
        }
        case 'message': {
          const message = parsedData.message;
          const author = parsedData.author;

          const messageInstance = new Message({
            db,
            message,
            author,
          });

          const isHarmful = await messageInstance.isHarmful();
          console.log({ isHarmful });
          if (isHarmful === null || isHarmful === true) {
            return;
          }

          const newMessage = await new Messages(db).addMessage({
            message,
            author,
          });

          connections.forEach((connection) => {
            // Don't send the message back to the client that sent it
            if (connection === ws) return;

            try {
              connection.send(
                JSON.stringify({
                  type: 'message',
                  ...newMessage,
                })
              );
            } catch (error) {
              console.error('Error sending message to client', error);
            }
          });
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
