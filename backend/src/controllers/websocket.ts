import { WebsocketRequestHandler } from 'express-ws';
import { Session } from '../models/Session';
import { User } from '../models/User';
import { GameStatus } from '../models/GameStatus';
import { redisClient, redisSubscriber } from '../redis';
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

    ws.on('message', async (message) => {
      const parsedData = JSON.parse(message.toString());

      switch (parsedData.type) {
        case 'update-count': {
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

            ws.send(JSON.stringify({ type: 'game-over' }));

            return;
          }
        }
      }
    });
  } catch (error) {
    console.log('Websocket error', error);
  }
};
