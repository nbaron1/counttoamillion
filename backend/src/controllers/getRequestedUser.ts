import { RequestHandler } from 'express';
import { User } from '../models/User';

export const getRequestedUser: RequestHandler = async (req, res) => {
  try {
    const userId = res.locals.userId;

    if (typeof userId !== 'string') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await new User(userId).get();

    if (!user) {
      res.status(404).json({ error: 'User not found', success: false });
      return;
    }

    res.status(200).json({ data: { user }, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
};
