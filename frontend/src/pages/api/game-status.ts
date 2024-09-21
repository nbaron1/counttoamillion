import { type APIRoute } from 'astro';
import postgres from 'postgres';

export const GET: APIRoute = async ({ request, locals }) => {
  const sql = postgres(locals.runtime.env.DATABASE_URL);

  const result = await sql`SELECT * from game_status limit 1`;

  const gameStatus = result[0];

  return new Response(JSON.stringify(gameStatus), { status: 200 });
};
