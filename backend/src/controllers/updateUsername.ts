import { RequestHandler } from 'express-serve-static-core';
import { moderateText } from '../utils/moderateText';
import { User } from '../models/User';

export const updateUsername: RequestHandler = async (req, res) => {
  try {
    const userId = res.locals.userId;

    if (typeof userId !== 'string') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (typeof req.body.username !== 'string') {
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    const username = req.body.username;

    if (username.length === 0) {
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    const moderatedUsername = await moderateText(username);

    if (moderatedUsername === null) {
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    const user = await new User(userId).updateUsername(moderatedUsername);

    res.status(200).json({ data: { user }, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
};
