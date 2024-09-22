import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import { config } from './config';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { sql } from './sql';

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

  console.log({ currentScore });

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

const getUserRank = async (userId: string) => {
  const [userRank] = await sql`
  with ranked_users as (
    select 
      id, 
      high_score,
      dense_rank() over (order by high_score desc) as rank
    from app_user
  )
  select * 
  from ranked_users
  where id = ${userId}`;

  return Number(userRank.rank);
};

app.ws('/rank', async (ws, request) => {
  const token = request.query.token;

  if (typeof token !== 'string') {
    ws.close(1008, 'Unauthorized');
    return;
  }

  const { data: userResult } = await supabase.auth.getUser(token);

  if (!userResult.user) {
    ws.close(1008, 'Unauthorized');
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = userResult.user.id;

  const rank = await getUserRank(userId);

  ws.send(
    JSON.stringify({
      type: 'rank',
      value: rank,
    })
  );

  ws.on('message', async (message) => {
    const data = JSON.parse(message.toString());

    if (data.type !== 'rank') return;

    const rank = await getUserRank(userId);

    ws.send(
      JSON.stringify({
        type: 'rank',
        value: rank,
      })
    );
  });
});

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
