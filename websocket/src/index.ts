import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

const wss = new WebSocketServer({ port });

// const sql = potgres

const checkIfTokenIsValid = (token: string) => {
  try {
    return true;
  } catch (error) {
    return false;
  }
};

wss.on('connection', (ws: WebSocket, req) => {
  const token = req.url?.split('=')[1];

  if (!token) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  const { userId } = jwt.verify(token, process.env.JWT_SECRET as string) as {
    userId: string;
  };

  console.log({ userId });

  // get the userId token cookie??
  // const token = new URL(ws.url).searchParams.get('token');

  // verify the token
  // const isTokenValid = false;

  // if (!token) {
  //   ws.close(1008, 'Unauthorized');
  //   return;
  // }

  ws.on('error', (error) => {
    console.log('error');
  });

  ws.on('message', async (message: string) => {
    const parsedData = JSON.parse(message.toString());

    console.log('parsedData', parsedData);

    console.log('message', message.toString());
  });

  ws.send(JSON.stringify({ type: 'update-count', value: 5 }));
});
