import express, { NextFunction, Request, Response } from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import { config } from './config';
import { sql } from './sql';
import cookieParser from 'cookie-parser';
import { generateRandomUsername } from './utils/generateARandomUsername';
import { redisClient, redisSubscriber } from './redis';

const app = expressWs(express()).app;
app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(
    cors({
      origin: ['http://localhost:3000'],
      credentials: true,
      exposedHeaders: ['Location'],
    })
  );
} else {
  app.use(
    cors({
      origin: [
        'https://counttoamillion.com',
        'https://www.counttoamillion.com',
      ],
      credentials: true,
      exposedHeaders: ['Location'],
    })
  );
}

class Session {
  constructor(public readonly id: string) {}

  async get() {
    const [session] = await sql`select * from session where id = ${this.id}`;

    if (!session) {
      return null;
    }

    const isExpired = new Date(session.expires_at).getTime() < Date.now();
    console.log({ isExpired });

    if (isExpired) {
      await sql`delete from session where id = ${this.id}`;
      return null;
    }

    return session;
  }
}

app.post('/auth/google', async (req, res) => {
  try {
    if (typeof req.body.code !== 'string') {
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    const code = req.body.code;

    const params = new URLSearchParams({
      code: code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: config.googleRedirectURI,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    });

    if (!tokenResponse.ok) {
      res.header('location', '/auth/failed');
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    const tokenData = await tokenResponse.json();

    const { access_token } = tokenData;

    // Use the access token to get user information
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      res.header('location', '/auth/failed');
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    const { email } = await userInfoResponse.json();

    const [existingUser] =
      await sql`select * from app_user where email = ${email}`;

    if (existingUser) {
      const [session] =
        await sql`insert into session (id, user_id) values (gen_random_uuid(), ${existingUser.id}) returning id`;

      res.cookie('session', session.id);
      res.header('location', '/');
      res.status(200).json({ success: true });
      return;
    }

    if (typeof email !== 'string') {
      res.header('location', '/auth/failed');
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    if (req.cookies.session) {
      const session = await new Session(req.cookies.session).get();

      if (session) {
        await sql`update app_user set email = ${email} where id = ${session.user_id}`;

        res.header('location', '/');
        res.status(200).json({ success: true });
        return;
      }
    }

    const sessionId = await sql.begin(async (sql) => {
      const username = generateRandomUsername();

      const [user] = await sql`
      INSERT INTO app_user (id, username, email)
      VALUES (gen_random_uuid(), ${username}, ${email}) RETURNING id`;

      const [session] = await sql`
      INSERT INTO session (id, user_id)
      VALUES (gen_random_uuid(), ${user.id}) RETURNING id`;

      const [newAttempt] = await sql`
      INSERT INTO attempt (user_id)
      VALUES (${user.id}) RETURNING id`;

      await sql`
      UPDATE app_user
      SET current_attempt_id = ${newAttempt.id}`;

      return session.id;
    });

    res.cookie('session', sessionId);
    res.header('location', '/');
    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: 'Internal Server Error', success: false });
  }
});

app.post('/auth/logout', async (req, res) => {
  try {
    const sessionToken = req.cookies.session;

    if (typeof sessionToken === 'string') {
      await sql`delete from session where id = ${sessionToken}`;
    }

    res.header('location', '/auth/guest');
    res.clearCookie('session');
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

app.post('/auth/guest', async (req, res) => {
  try {
    const sessionToken = req.cookies.session;

    if (typeof sessionToken === 'string') {
      const [session] =
        await sql`select * from session where id = ${sessionToken}`;

      if (session) {
        const isExpired = new Date(session.expires_at).getTime() < Date.now();

        if (!isExpired) {
          res.header('location', '/');
          res.status(200).json({ success: true });
          return;
        }
      }
    }

    // todo: make sure the username is unique
    const username = generateRandomUsername();

    const sessionId = await sql.begin(async (sql) => {
      const [newUser] = await sql`
      INSERT INTO app_user (id, username)
      VALUES (gen_random_uuid(), ${username}) RETURNING id`;

      const [newSession] = await sql`
      INSERT INTO session (id, user_id)
      VALUES (gen_random_uuid(), ${newUser.id}) RETURNING id`;

      const [newAttempt] = await sql`
      INSERT INTO attempt (user_id)
      VALUES (${newUser.id}) RETURNING id`;

      await sql`
      UPDATE app_user
      SET current_attempt_id = ${newAttempt.id} where id = ${newUser.id}`;

      return newSession.id;
    });

    res.cookie('session', sessionId);
    res.header('location', '/');

    res.status(200).send({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

app.get('/health', (_, res) => {
  res.send('OK');
});

const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sessionToken = req.cookies.session;

  if (typeof sessionToken !== 'string') {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized', success: false });
    return;
  }

  const [session] =
    await sql`select * from session inner join app_user on session.user_id = app_user.id where session.id = ${sessionToken}`;

  if (!session) {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized', success: false });
    return;
  }

  const isExpired = new Date(session.expires_at).getTime() < Date.now();

  if (isExpired) {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized', success: false });
    return;
  }

  const [user] =
    await sql`select * from app_user where id = ${session.user_id}`;

  if (!user) {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized', success: false });
    return;
  }

  res.locals.userId = user.id;

  next();

  await sql`update session set expires_at = now() + interval '7 days' where id = ${sessionToken}`;
};

app.get('/users', protectRoute, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const offset = (page - 1) * limit;

    const users = await sql`
  with ranked_users as (
    select
      *,
      dense_rank() over (order by score desc) as rank,
      row_number() OVER (order by score desc) as position
    from app_user
    inner join attempt on app_user.current_attempt_id = attempt.id
  )
  select *
  from ranked_users
  order by rank asc
  limit ${limit}
  offset ${offset}`;

    res.status(200).json({
      data: {
        users,
      },
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

app.get('/users/count', protectRoute, async (_, res) => {
  try {
    const [count] = await sql`select count(*) from app_user`;

    res
      .status(200)
      .json({ data: { count: Number(count.count) }, success: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

app.get('/game-status', async (req, res) => {
  try {
    const [gameStatus] = await sql`select * from game_status where id = 1`;

    res.status(200).json({ data: { gameStatus }, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

app.get('/users/me', protectRoute, async (req, res) => {
  try {
    const userId = res.locals.userId;

    if (typeof userId !== 'string') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const [user] = await sql`select * from app_user where id = ${userId}`;

    if (!user) {
      res.status(404).json({ error: 'User not found', success: false });
      return;
    }

    res.status(200).json({ data: { user }, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

app.get('/users/:userId', protectRoute, async (req, res) => {
  try {
    const userId = req.params.userId;

    const [user] = await sql`select * from app_user where id = ${userId}`;

    if (!user) {
      res.status(404).json({ error: 'User not found', success: false });
      return;
    }

    res.status(200).json({ data: { user }, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

app.put('/users/me/username', protectRoute, async (req, res) => {
  try {
    const userId = res.locals.userId;

    if (typeof userId !== 'string') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (typeof req.body.username !== 'string') {
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    const username = req.body.username;

    const [user] =
      await sql`update app_user set username = ${username} where id = ${userId} returning *`;

    res.status(200).json({ data: { user }, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

app.get('/users/me/rank', protectRoute, async (req, res) => {
  try {
    if (typeof res.locals.userId !== 'string') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { position, rank } = await getUserRank(res.locals.userId);

    res.status(200).json({ data: { position, rank }, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
});

app.ws('/score', async (ws, request) => {
  try {
    const sessionToken = request.cookies.session;

    if (typeof sessionToken !== 'string') {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const [session] =
      await sql`select * from session inner join app_user on session.user_id = app_user.id where session.id = ${sessionToken}`;

    if (!session) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const isExpired = new Date(session.expires_at).getTime() < Date.now();

    if (isExpired) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const [user] =
      await sql`select * from app_user where id = ${session.user_id}`;

    if (!user) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const [currentAttempt] =
      await sql`select score from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${user.id} limit 1`;

    if (!currentAttempt) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const [isGameOver] =
      await sql`select ended_at from game_status where id = 1`;

    if (isGameOver.ended_at !== null) {
      ws.send(JSON.stringify({ type: 'game-over' }));
      ws.close(1000, 'Game over');
      return;
    }

    await redisSubscriber.subscribe('game-over', () => {
      ws.send(JSON.stringify({ type: 'game-over' }));
    });

    const currentScore = Number(currentAttempt.score);

    ws.send(
      JSON.stringify({
        type: 'update-count',
        value: currentScore,
      })
    );

    let verificationRequired = true;
    let requestsSinceVerification = 0;

    ws.on('message', async (message) => {
      const parsedData = JSON.parse(message.toString());

      switch (parsedData.type) {
        case 'verify': {
          if (typeof parsedData.token !== 'string') {
            return;
          }

          try {
            const response = await fetch(
              'https://challenges.cloudflare.com/turnstile/v0/siteverify',
              {
                method: 'POST',
                body: JSON.stringify({
                  response: parsedData.token,
                  secret: config.turnstileSecret,
                }),
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            if (!response.ok) {
              throw new Error('Verification failed');
            }

            const body = await response.json();

            if (
              !body ||
              typeof body !== 'object' ||
              !('success' in body) ||
              body.success !== true
            ) {
              throw new Error('Verification failed');
            }

            verificationRequired = false;
            requestsSinceVerification = 0;

            ws.send(JSON.stringify({ type: 'verified' }));
          } catch (error) {
            ws.send(JSON.stringify({ type: 'verification-required' }));
          }

          break;
        }
        case 'update-count': {
          if (verificationRequired) {
            ws.send(JSON.stringify({ type: 'verification-required' }));
            return;
          }

          if (typeof parsedData.value !== 'number') {
            return;
          }

          // todo: refactor into one userId
          const [currentAttempt] =
            await sql`select score from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${user.id} limit 1`;

          const currentCount = Number(currentAttempt.score);

          if (currentCount + 1 != parsedData.value) {
            await sql`WITH inserted AS (
				       INSERT INTO attempt (user_id, score)
				       VALUES (${user.id}, 1)
				       RETURNING id
				       )
				       UPDATE app_user
				       SET current_attempt_id = (SELECT id FROM inserted)
				       WHERE id = ${user.id}`;

            ws.send(JSON.stringify({ type: 'update-count', value: 1 }));

            const newRequestsSinceVerification = requestsSinceVerification + 1;

            const isVerificationRequired =
              newRequestsSinceVerification >=
              config.maxRequestsSinceVerification;

            if (isVerificationRequired) {
              ws.send(JSON.stringify({ type: 'verification-required' }));
            }

            verificationRequired = isVerificationRequired;
            requestsSinceVerification = newRequestsSinceVerification;

            return;
          }

          await sql`UPDATE attempt
				     SET score = ${parsedData.value}
				     WHERE id = (SELECT current_attempt_id FROM app_user WHERE id = ${user.id})`;

          ws.send(
            JSON.stringify({ type: 'update-count', value: parsedData.value })
          );

          const ONE_MILLION = 1000000;

          if (currentCount + 1 >= ONE_MILLION) {
            await sql`update game_status set ended_at = now() at time zone 'utc', winner_id = ${user.id} where id = 1`;
            await redisClient.publish('game-over', '1');

            // ws.send(JSON.stringify({ type: 'game-over' }));
            return;
          }

          const newRequestsSinceVerification = requestsSinceVerification + 1;

          const isVerificationRequired =
            newRequestsSinceVerification >= config.maxRequestsSinceVerification;

          if (isVerificationRequired) {
            ws.send(JSON.stringify({ type: 'verification-required' }));
          }

          verificationRequired = isVerificationRequired;
          requestsSinceVerification = newRequestsSinceVerification;
        }
      }
    });
  } catch (error) {
    console.log('Websocket error', error);
  }
});

const getUserRank = async (
  userId: string
): Promise<{ rank: number; position: number }> => {
  const [userRank] = await sql`
  with ranked_users as (
    select 
      app_user.id, 
      high_score,
      score,
      dense_rank() over (order by score desc) as rank,
      row_number() OVER (order BY score DESC) AS position
    from app_user
    inner join attempt on app_user.current_attempt_id = attempt.id 
  )
  select rank, position
  from ranked_users
  where id = ${userId}`;

  const data = {
    rank: Number(userRank.rank),
    position: Number(userRank.position),
  };

  return data;
};

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
