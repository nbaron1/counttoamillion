import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import potgres from 'postgres';

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

const wss = new WebSocketServer({ port });

console.log(process.env.DATABASE_URL);
const sql = potgres(process.env.DATABASE_URL as string);

const checkIfTokenIsValid = (token: string) => {
  try {
    return true;
  } catch (error) {
    return false;
  }
};

wss.on('connection', async (ws: WebSocket, req) => {
  const token = req.url?.split('=')[1];

  if (!token) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  const { userId } = jwt.verify(token, process.env.JWT_SECRET as string) as {
    userId: string;
  };

  const [currentAttempt] =
    await sql`select count from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${userId} limit 1`;

  ws.send(
    JSON.stringify({
      type: 'update-count',
      value: Number(currentAttempt.count),
    })
  );

  ws.on('error', (error) => {
    console.log('error');
  });

  ws.on('message', async (message: string) => {
    const parsedData = JSON.parse(message.toString());

    switch (parsedData.type) {
      case 'update-count': {
        if (typeof parsedData.value !== 'number') {
          return;
        }

        const [currentAttempt] =
          await sql`select count from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${userId} limit 1`;

        const currentCount = Number(currentAttempt.count);

        if (currentCount + 1 != parsedData.value) {
          await sql`WITH inserted AS (
               INSERT INTO attempt (user_id, count) 
               VALUES (${userId}, 1) 
               RETURNING id
               )
               UPDATE app_user 
               SET current_attempt_id = (SELECT id FROM inserted)
               WHERE id = ${userId}`;

          ws.send(JSON.stringify({ type: 'update-count', value: 1 }));
          return;
        }

        await sql`UPDATE attempt 
        SET count = ${parsedData.value} 
        WHERE id = (SELECT current_attempt_id FROM app_user WHERE id = ${userId})`;

        ws.send(
          JSON.stringify({ type: 'update-count', value: parsedData.value })
        );
      }
    }
    console.log('parsedData', parsedData);

    console.log('message', message.toString());
  });
});
