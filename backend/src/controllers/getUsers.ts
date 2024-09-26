import { RequestHandler } from 'express';
import { Users } from '../models/Users';

export const getUsers: RequestHandler = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const users = await new Users().getRanked({ page, limit });

    res.status(200).json({
      data: {
        users,
      },
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
};
