import { RequestHandler } from 'express';
import { User } from '../models/User';

export const getMyRank: RequestHandler = async (req, res) => {
  try {
    if (typeof res.locals.userId !== 'string') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { position, rank } = await new User(res.locals.userId).getRank();

    res.status(200).json({ data: { position, rank }, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
};
