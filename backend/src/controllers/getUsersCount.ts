import { Users } from '../models/Users';
import { RequestHandler } from 'express';

export const getUsersCount: RequestHandler = async (req, res) => {
  try {
    const count = await new Users().getCount();

    res
      .status(200)
      .json({ data: { count: Number(count.count) }, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
};
