import postgres from 'postgres';
import { type Database } from './database.types';
import { createClient } from '@supabase/supabase-js';

const getSupabase = (env: Env) => {
	return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
};

export async function handleCount(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const upgradeHeader = request.headers.get('Upgrade');
	if (!upgradeHeader || upgradeHeader !== 'websocket') {
		return new Response('Expected Upgrade: websocket', { status: 426 });
	}

	const webSocketPair = new WebSocketPair();
	const [client, server] = Object.values(webSocketPair);

	server.accept();

	const sql = postgres(env.DATABASE_URL);
	const supabase = getSupabase(env);
	const token = new URL(request.url).searchParams.get('token');
	console.log({ token });

	if (typeof token !== 'string') {
		server.close(1008, 'Unauthorized');
		return new Response('Unauthorized', { status: 401 });
	}

	const { data: userResult } = await supabase.auth.getUser(token);

	if (!userResult.user) {
		server.close(1008, 'Unauthorized');
		return new Response('Unauthorized', { status: 401 });
	}

	const userId = userResult.user.id;

	const currentCountResult =
		await sql`select count from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${userId} limit 1`;

	const currentCount = Number(currentCountResult[0].count);

	server.send(
		JSON.stringify({
			type: 'update-count',
			value: currentCount,
		})
	);

	server.addEventListener('message', async (event) => {
		const parsedData = JSON.parse(event.data.toString());
		console.log({ parsedData });
		switch (parsedData.type) {
			case 'update-count': {
				if (typeof parsedData.value !== 'number') {
					return;
				}

				// todo: refactor into one userId
				const currentCountResult =
					await sql`select count from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${userId} limit 1`;

				const currentCount = Number(currentCountResult[0].count);

				if (currentCount + 1 != parsedData.value) {
					await sql`WITH inserted AS (
				       INSERT INTO attempt (user_id, count)
				       VALUES (${userId}, 1)
				       RETURNING id
				       )
				       UPDATE app_user
				       SET current_attempt_id = (SELECT id FROM inserted)
				       WHERE id = ${userId}`;

					server.send(JSON.stringify({ type: 'update-count', value: 1 }));
					return;
				}

				await sql`UPDATE attempt
				     SET count = ${parsedData.value}
				     WHERE id = (SELECT current_attempt_id FROM app_user WHERE id = ${userId})`;

				server.send(JSON.stringify({ type: 'update-count', value: parsedData.value }));
			}
		}
	});

	console.log({ currentCountResult });

	return new Response(null, {
		status: 101,
		webSocket: client,
	});
}
