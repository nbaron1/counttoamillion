import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import { config } from './config';

const app = expressWs(express()).app;

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

app.ws('/score', (ws) => {
  console.log('Connected to /score');

  ws.on('message', async (message) => {
    console.log('ws score data', message);
  });
});

app.ws('/rank', (ws) => {
  console.log('Connected to /rank');

  ws.on('message', async (message) => {
    console.log('ws score data', message);
  });
});

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
