import './sentry';
import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import { config } from './config';
import cookieParser from 'cookie-parser';
import { googleAuth } from './controllers/googleAuth';
import { logout } from './controllers/logout';
import { guestAuth } from './controllers/guestAuth';
import { protectRoute } from './middlewares/protectRoute';
import { getUsers } from './controllers/getUsers';
import { getUsersCount } from './controllers/getUsersCount';
import { getGameStatus } from './controllers/getGameStatus';
import { getRequestedUser } from './controllers/getRequestedUser';
import { getUser } from './controllers/getUser';
import { updateUsername } from './controllers/updateUsername';
import { getMyRank } from './controllers/getMyRank';
import { handleWebsocket } from './controllers/websocket';

const app = expressWs(express()).app;
app.use(express.json());
app.use(cookieParser());

const allowedOrigins =
  process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000']
    : ['https://counttoamillion.com', 'https://www.counttoamillion.com'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ['Location'],
  })
);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin) {
    return res.sendStatus(401);
  }

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Location');
  }
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.sendStatus(401);
  }

  next();
});

app.post('/auth/google', googleAuth);
app.post('/auth/logout', logout);
app.post('/auth/guest', guestAuth);

app.get('/health', (_, res) => {
  res.send('OK');
});

app.get('/users', protectRoute, getUsers);
app.get('/users/count', protectRoute, getUsersCount);
app.get('/game-status', getGameStatus);
app.get('/users/me', protectRoute, getRequestedUser);
app.get('/users/:userId', protectRoute, getUser);
app.put('/users/me/username', protectRoute, updateUsername);
app.get('/users/me/rank', protectRoute, getMyRank);

app.ws('/score', handleWebsocket);

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
