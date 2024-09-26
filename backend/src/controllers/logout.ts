import { RequestHandler } from 'express';
import { Session } from '../models/Session';

export const logout: RequestHandler = async (req, res) => {
  try {
    const sessionId = req.cookies.session;

    if (typeof sessionId === 'string') {
      await new Session(sessionId).delete();
    }

    res.header('location', '/auth/guest');
    res.clearCookie('session');
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
};
