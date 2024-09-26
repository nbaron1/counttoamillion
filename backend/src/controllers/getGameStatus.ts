import { RequestHandler } from 'express';
import { GameStatus } from '../models/GameStatus';

export const getGameStatus: RequestHandler = async (_, res) => {
  try {
    const gameStatus = await new GameStatus().get();

    res.status(200).json({ data: { gameStatus }, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', success: false });
  }
};
