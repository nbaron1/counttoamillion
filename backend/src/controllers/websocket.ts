import { WebsocketRequestHandler } from 'express-ws';
import { Session } from '../models/Session';
import { User } from '../models/User';
import { GameStatus } from '../models/GameStatus';
import { redisClient, redisSubscriber } from '../redis';
import { config } from '../config';
import { sql } from '../sql';

export const handleWebsocket: WebsocketRequestHandler = async (ws, request) => {
  try {
    const sessionToken = request.cookies.session;

    if (typeof sessionToken !== 'string') {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const session = await new Session(sessionToken).get({ includeUser: true });

    if (!session) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const user = await new User(session.user_id).get();

    if (!user) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const currentAttempt = await new User(user.id).getCurrentAttempt();

    if (!currentAttempt) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const gameStatus = await new GameStatus().get();

    if (gameStatus.ended_at !== null) {
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

          // freeze bad.bot at 6969
          if (
            user.id === '5b08193a-f1ac-4635-888d-a0827d47e5a7' &&
            currentCount === 6969
          ) {
            await sql`update app_user set username = 'good.bot :)' where id = ${user.id}`;
            return;
          }

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
};
