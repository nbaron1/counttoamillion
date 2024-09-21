import jwt from 'jsonwebtoken';
import { type APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies, locals }) => {
  const userIdCookie = cookies.get('userId');

  if (!userIdCookie) {
    return new Response(null, { status: 401 });
  }

  const { userId } = jwt.verify(
    userIdCookie.value,
    locals.runtime.env.JWT_SECRET
  ) as { userId: string };

  const temporaryToken = jwt.sign({ userId }, locals.runtime.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  return new Response(JSON.stringify({ token: temporaryToken }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
