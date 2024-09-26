import { Response } from 'express';

const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;

export const setSessionCookie = (res: Response, sessionId: string) => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    res.cookie('session', sessionId);
    return;
  }

  res.cookie('session', sessionId, {
    expires: new Date(Date.now() + ONE_YEAR),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });
};
