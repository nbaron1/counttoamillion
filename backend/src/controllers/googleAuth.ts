import { type RequestHandler } from 'express';
import { config } from '../config';
import { Session } from '../models/Session';
import { Sessions } from '../models/Sessions';
import { Users } from '../models/Users';
import { User } from '../models/User';
import { TEN_YEARS } from '../constants';

export const googleAuth: RequestHandler = async (req, res) => {
  try {
    if (typeof req.body.code !== 'string') {
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    const code = req.body.code;

    const params = new URLSearchParams({
      code: code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: config.googleRedirectURI,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    });

    if (!tokenResponse.ok) {
      res.header('location', '/auth/failed');
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    const tokenData = await tokenResponse.json();

    const { access_token } = tokenData;

    // Use the access token to get user information
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      res.header('location', '/auth/failed');
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    const { email } = await userInfoResponse.json();

    const existingUser = await new Users().getByEmail(email);

    if (existingUser) {
      const session = await new Sessions().create(existingUser.id);

      res.cookie('session', session.id, {
        expires: new Date(Date.now() + TEN_YEARS),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false,
      });
      res.header('location', '/');
      res.status(200).json({ success: true });
      return;
    }

    if (typeof email !== 'string') {
      res.header('location', '/auth/failed');
      res.status(400).json({ error: 'Bad Request', success: false });
      return;
    }

    if (req.cookies.session) {
      const session = await new Session(req.cookies.session).get({
        includeUser: false,
      });

      if (session) {
        await new User(session.user_id).updateEmail(email);

        res.header('location', '/');
        res.status(200).json({ success: true });
        return;
      }
    }

    const { session } = await new Users().create(email);

    res.cookie('session', session.id, {
      expires: new Date(Date.now() + TEN_YEARS),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false,
    });
    res.header('location', '/');
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).send({ error: 'Internal Server Error', success: false });
  }
};
