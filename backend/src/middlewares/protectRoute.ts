import { Request, NextFunction, Response } from 'express';
import { Session } from '../models/Session';
import { User } from '../models/User';

export const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sessionId = req.cookies.session;

  if (typeof sessionId !== 'string') {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized', success: false });
    return;
  }

  const session = await new Session(sessionId).get({ includeUser: false });

  if (!session) {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized', success: false });
    return;
  }

  const isExpired = new Date(session.expires_at).getTime() < Date.now();

  if (isExpired) {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized', success: false });
    return;
  }

  const user = await new User(session.user_id).get();

  if (!user) {
    res.header('location', '/auth/guest');
    res.status(401).json({ error: 'Unauthorized', success: false });
    return;
  }

  res.locals.userId = user.id;

  next();

  await new Session(sessionId).extend();
};
