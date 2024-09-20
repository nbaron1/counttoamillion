import express from 'express';
import { config } from './config';
import expressWs from 'express-ws';
import cors from 'cors';
import { db } from './db';
import { supabase } from './supabase';

const app = expressWs(express()).app;

app.use(cors({ origin: [config.frontendHost], credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

app.ws('/v1/count', async (ws, req) => {
  const token = req.query.token;

  if (typeof token !== 'string') {
    ws.close(1008, 'Unauthorized');
    return;
  }

  // todo: verify with just a jwt library
  const { data: userResult } = await supabase.auth.getUser(token);

  if (!userResult.user) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  const userId = userResult.user.id;

  const currentCountResult =
    await db`select count from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${userId} limit 1`;

  const currentAttemptCount = Number(currentCountResult[0].count);

  ws.send(
    JSON.stringify({
      type: 'update-count',
      value: currentAttemptCount,
    })
  );

  ws.on('message', async (data) => {
    const parsedData = JSON.parse(data.toString());

    switch (parsedData.type) {
      case 'update-count': {
        if (typeof parsedData.value !== 'number') {
          return;
        }

        const currentCountResult =
          await db`select count from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${userId} limit 1`;

        const currentAttemptCount = Number(currentCountResult[0].count);
        if (!currentAttemptCount) return;

        if (currentAttemptCount + 1 != parsedData.value) {
          await db`WITH inserted AS (
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

        await db`UPDATE attempt 
           SET count = ${parsedData.value} 
           WHERE id = (SELECT current_attempt_id FROM app_user WHERE id = ${userId})`;

        ws.send(
          JSON.stringify({ type: 'update-count', value: parsedData.value })
        );
      }
    }
  });
});

app.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`);
});

/*

          // const message = parsedData.message;
          // const author = parsedData.author;
          // const messageInstance = new Message({
          //   db,
          //   message,
          //   author,
          // });
          // const isHarmful = await messageInstance.isHarmful();
          // console.log({ isHarmful });
          // if (isHarmful === null || isHarmful === true) {
          //   return;
          // }
          // const newMessage = await new Messages(db).addMessage({
          //   message,
          //   author,
          // });
          // connections.forEach((connection) => {
          //   // Don't send the message back to the client that sent it
          //   if (connection === ws) return;
          //   try {
          //     connection.send(
          //       JSON.stringify({
          //         type: 'message',
          //         ...newMessage,
          //       })
          //     );
          //   } catch (error) {
          //     console.error('Error sending message to client', error);
          //   }
          // });


*/
