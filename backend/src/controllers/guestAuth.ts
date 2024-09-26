import { RequestHandler } from 'express';
import { Users } from '../models/Users';
import { Session } from '../models/Session';
import { TEN_YEARS } from '../constants';

export const guestAuth: RequestHandler = async (req, res) => {
  try {
    const sessionId = req.cookies.session;

    if (typeof sessionId === 'string') {
      const session = await new Session(sessionId).get({ includeUser: false });

      if (session) {
        res.header('location', '/');
        res.status(200).json({ success: true });
        return;
      }
    }

    const { session } = await new Users().create(null);

    res.cookie('session', session.id, {
      expires: new Date(Date.now() + TEN_YEARS),
    });
    res.header('location', '/');
    res.status(200).send({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
};
