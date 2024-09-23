import express, { NextFunction, Request, Response } from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import { config } from './config';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { sql } from './sql';
import { pubClient, subClient } from './redis';

const app = expressWs(express()).app;

const supabase = createClient<Database>(
  config.supabaseURL,
  config.supabaseSecretKey
);

if (process.env.NODE_ENV === 'development') {
  app.use(cors({ origin: ['http://localhost:3000'] }));
} else {
  app.use(
    cors({
      origin: [
        'https://counttoamillion.com',
        'https://www.counttoamillion.com',
      ],
    })
  );
}

app.get('/health', (req, res) => {
  res.send('OK');
});

const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization;

  if (typeof authorization !== 'string') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authorization.split('Bearer ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { data: userResult } = await supabase.auth.getUser(token);

  if (!userResult.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.locals.userId = userResult.user.id;

  next();
};

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
  const token = request.query.token;

  if (typeof token !== 'string') {
    ws.close(1008, 'Unauthorized');
    return;
  }

  const { data: userResult } = await supabase.auth.getUser(token);

  if (!userResult.user) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  const userId = userResult.user.id;

  const [currentAttempt] =
    await sql`select score from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${userId} limit 1`;

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
          await sql`select score from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${userId} limit 1`;

        const currentCount = Number(currentAttempt.score);

        if (currentCount + 1 != parsedData.value) {
          await sql`WITH inserted AS (
				       INSERT INTO attempt (user_id, score)
				       VALUES (${userId}, 1)
				       RETURNING id
				       )
				       UPDATE app_user
				       SET current_attempt_id = (SELECT id FROM inserted)
				       WHERE id = ${userId}`;

          ws.send(JSON.stringify({ type: 'update-count', value: 1 }));

          const newRequestsSinceVerification = requestsSinceVerification + 1;

          // todo: use env variable for max requests per verification
          const isVerificationRequired = newRequestsSinceVerification >= 5;

          if (isVerificationRequired) {
            ws.send(JSON.stringify({ type: 'verification-required' }));
          }

          verificationRequired = isVerificationRequired;
          requestsSinceVerification = newRequestsSinceVerification;

          return;
        }

        await sql`UPDATE attempt
				     SET score = ${parsedData.value}
				     WHERE id = (SELECT current_attempt_id FROM app_user WHERE id = ${userId})`;

        ws.send(
          JSON.stringify({ type: 'update-count', value: parsedData.value })
        );

        const newRequestsSinceVerification = requestsSinceVerification + 1;

        // todo: use env variable for max requests per verification
        const isVerificationRequired = newRequestsSinceVerification >= 5;

        if (isVerificationRequired) {
          ws.send(JSON.stringify({ type: 'verification-required' }));
        }

        verificationRequired = isVerificationRequired;
        requestsSinceVerification = newRequestsSinceVerification;
      }
    }
  });
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
  const token = request.query.token;

  if (typeof token !== 'string') {
    ws.close(1008, 'Unauthorized');
    return;
  }

  const { data: userResult } = await supabase.auth.getUser(token);

  if (!userResult.user) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  const userId = userResult.user.id;
  const username = userResult.user.user_metadata.username;

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
