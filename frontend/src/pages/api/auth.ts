import type { APIRoute } from 'astro';
import { v4 as uuid } from 'uuid';
import jwt from 'jsonwebtoken';
import postgres from 'postgres';
import { generateSlug } from 'random-word-slugs';

export const POST: APIRoute = async ({ cookies, locals }) => {
  const userIdCookie = cookies.get('userId');
  const sql = postgres(locals.runtime.env.DATABASE_URL);

  if (userIdCookie) {
    console.log({ userIdCookie });
    const { userId } = jwt.verify(
      userIdCookie.value,
      locals.runtime.env.JWT_SECRET
    ) as { userId: string };

    const userExistsResponse =
      await sql`SELECT EXISTS (SELECT 1 FROM app_user WHERE id = ${userId})`;

    const { exists } = userExistsResponse[0];
    if (exists) {
      return new Response(null, { status: 200 });
    }
  }

  const newUser = await sql.begin(async (sql) => {
    const userId = uuid();
    const username = generateSlug(2, { format: 'title' });

    const [user] =
      await sql`INSERT INTO app_user (id, username) VALUES (${userId}, ${username}) RETURNING *`;

    const [attempt] =
      await sql`INSERT INTO attempt (user_id) VALUES (${userId}) RETURNING *`;

    await sql`UPDATE app_user SET current_attempt_id = ${attempt.id} WHERE id = ${userId}`;

    return user;
  });

  const userIdJWT = jwt.sign(
    { userId: newUser.id },
    locals.runtime.env.JWT_SECRET
  );

  cookies.set('userId', userIdJWT, { httpOnly: true, secure: true });

  return new Response(null, { status: 201 });
};
