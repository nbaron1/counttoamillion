import express, { NextFunction, Request, Response } from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import { config } from './config';
import { sql } from './sql';
import { pubClient, subClient } from './redis';
import cookieParser from 'cookie-parser';
import { generateRandomUsername } from './utils/generateARandomUsername';

const app = expressWs(express()).app;
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

app.post('/auth/guest', async (req, res) => {
  try {
    const sessionToken = req.cookies.session;

    if (typeof sessionToken === 'string') {
      const [session] =
        await sql`select * from session where id = ${sessionToken}`;

      if (session) {
        const isExpired = new Date(session.expires_at).getTime() > Date.now();

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

      console.log({ newSession });

      const [newAttempt] = await sql`
      INSERT INTO attempt (user_id)
      VALUES (${newUser.id}) RETURNING id`;

      await sql`
      UPDATE app_user
      SET current_attempt_id = ${newAttempt.id}`;

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
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const [session] =
    await sql`select * from session inner join app_user on session.user_id = app_user.id where session.id = ${sessionToken}`;

  if (!session) {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const isExpired = new Date(session.expires_at).getTime() < Date.now();

  if (isExpired) {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const [user] =
    await sql`select * from app_user where id = ${session.user_id}`;

  if (!user) {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.locals.userId = user.id;

  next();

  await sql`update session set expires_at = now() + interval '7 days' where id = ${sessionToken}`;
};

app.get('/game-status', protectRoute, async (req, res) => {
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
    }

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
      id, 
      high_score,
      dense_rank() over (order by high_score desc) as rank,
      row_number() OVER (order BY high_score DESC) AS position
    from app_user
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

app.ws('/chat', async (ws, request) => {
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
  // const { data: userResult } = await supabase.auth.getUser(token);

  // if (!userResult.user) {
  //   ws.close(1008, 'Unauthorized');
  //   return;
  // }

  // const userId = userResult.user.id;
  // const username = userResult.user.user_metadata.username;

  const userId = user.id;
  const username = '567';

  // subscribe to chat messages
  subClient.subscribe('chat', (message) => {
    const messageData = JSON.parse(message);

    if (
      typeof messageData.user_id !== 'string' ||
      typeof messageData.message !== 'string' ||
      typeof messageData.id !== 'number' ||
      typeof messageData.username !== 'string'
    ) {
      return;
    }

    if (messageData.user_id === userId) return;

    ws.send(
      JSON.stringify({
        type: 'message',
        message: messageData.message,
        username: messageData.username,
        created_at: messageData.created_at,
        user_id: messageData.userId,
        id: messageData.id,
      })
    );
  });

  ws.on('message', async (data) => {
    const message = data.toString();

    if (typeof message !== 'string' || typeof userId !== 'string') return;

    const [newMessage] =
      await sql`insert into message (message, user_id) values (${message}, ${userId}) RETURNING *`;

    // todo: send to openai moderation to verify before sending to other clients

    pubClient.publish(
      'chat',
      JSON.stringify({
        message,
        user_id: userId,
        created_at: newMessage.created_at,
        username,
        id: newMessage.id,
      })
    );
  });
});

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
