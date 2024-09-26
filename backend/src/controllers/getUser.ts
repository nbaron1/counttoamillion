import type { RequestHandler } from 'express';
import { User } from '../models/User';

export const getUser: RequestHandler = async (req, res) => {
  try {
    const userId = req.params.userId;

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
