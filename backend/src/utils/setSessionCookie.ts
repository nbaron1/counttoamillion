import { Response } from 'express';

const TEN_YEARS = 1000 * 60 * 60 * 24 * 365 * 10;

export const setSessionCookie = (res: Response, sessionId: string) => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    res.cookie('session', sessionId);
    return;
  }

  res.cookie('session', sessionId, {
    expires: new Date(Date.now() + TEN_YEARS),
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: '.counttoamillion.com',
  });
};
