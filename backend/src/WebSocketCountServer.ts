import { DurableObject } from 'cloudflare:workers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import postgres from 'postgres';
import { type Env } from '../worker-configuration';

export class WebSocketCountServer extends DurableObject<Env> {
	supabase: SupabaseClient<Database>;
	sql: postgres.Sql;
	sessions: Map<WebSocket, { userId: string; verificationRequired: boolean; requestsSinceVerification: number }> = new Map();

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
		this.sql = postgres(this.env.DATABASE_URL);
	}

	async fetch(request: Request): Promise<Response> {
		// Creates two ends of a WebSocket connection.
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		const token = new URL(request.url).searchParams.get('token');

		if (typeof token !== 'string') {
			server.close(1008, 'Unauthorized');
			return new Response('Unauthorized', { status: 401 });
		}

		this.ctx.acceptWebSocket(server);

		const { data: userResult } = await this.supabase.auth.getUser(token);

		if (!userResult.user) {
			server.close(1008, 'Unauthorized');
			return new Response('Unauthorized', { status: 401 });
		}

		const userId = userResult.user.id;

		const [currentAttempt] = await this
			.sql`select score from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${userId} limit 1`;

		const currentScore = Number(currentAttempt.score);

		server.send(
			JSON.stringify({
				type: 'update-count',
				value: currentScore,
			})
		);

		this.sessions.set(server, { userId, verificationRequired: true, requestsSinceVerification: 0 });

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
		const parsedData = JSON.parse(message.toString());
		const session = this.sessions.get(ws);

		if (!session) {
			ws.close(1008, 'Unauthorized');
			return;
		}

		const { userId, verificationRequired, requestsSinceVerification } = session;

		switch (parsedData.type) {
			case 'verify': {
				if (typeof parsedData.token !== 'string') {
					return;
				}

				try {
					const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
						method: 'POST',
						body: JSON.stringify({ response: parsedData.token, secret: this.env.CF_TURNSTILE_SECRET }),
						headers: {
							'Content-Type': 'application/json',
						},
					});

					if (!response.ok) {
						throw new Error('Verification failed');
					}

					const body = await response.json();

					if (!body || typeof body !== 'object' || !('success' in body) || body.success !== true) {
						throw new Error('Verification failed');
					}

					this.sessions.set(ws, {
						userId,
						verificationRequired: false,
						requestsSinceVerification: 0,
					});

					ws.send(JSON.stringify({ type: 'verified' }));
				} catch (error) {
					ws.send(JSON.stringify({ type: 'verification-required' }));
				}

				break;
			}
			case 'update-count': {
				if (verificationRequired) {
					ws.send(JSON.stringify({ type: 'verification-required' }));
					return;
				}

				if (typeof parsedData.value !== 'number') {
					return;
				}

				// todo: refactor into one userId
				const [currentAttempt] = await this
					.sql`select score from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${userId} limit 1`;

				const currentCount = Number(currentAttempt.score);

				if (currentCount + 1 != parsedData.value) {
					await this.sql`WITH inserted AS (
				       INSERT INTO attempt (user_id, score)
				       VALUES (${userId}, 1)
				       RETURNING id
				       )
				       UPDATE app_user
				       SET current_attempt_id = (SELECT id FROM inserted)
				       WHERE id = ${userId}`;

					ws.send(JSON.stringify({ type: 'update-count', value: 1 }));

					const newRequestsSinceVerification = requestsSinceVerification + 1;
					// todo: use env variable for max requests per verification
					const isVerificationRequired = newRequestsSinceVerification >= 5;

					if (isVerificationRequired) {
						ws.send(JSON.stringify({ type: 'verification-required' }));
					}

					this.sessions.set(ws, {
						userId,
						verificationRequired: isVerificationRequired,
						requestsSinceVerification: newRequestsSinceVerification,
					});

					return;
				}

				await this.sql`UPDATE attempt
				     SET score = ${parsedData.value}
				     WHERE id = (SELECT current_attempt_id FROM app_user WHERE id = ${userId})`;

				ws.send(JSON.stringify({ type: 'update-count', value: parsedData.value }));

				const newRequestsSinceVerification = requestsSinceVerification + 1;

				// todo: use env variable for max requests per verification
				const isVerificationRequired = newRequestsSinceVerification >= 5;

				if (isVerificationRequired) {
					ws.send(JSON.stringify({ type: 'verification-required' }));
				}

				this.sessions.set(ws, {
					userId,
					verificationRequired: isVerificationRequired,
					requestsSinceVerification: newRequestsSinceVerification,
				});
			}
		}
	}

	async webSocketClose(ws: WebSocket) {
		this.sessions.delete(ws);
	}
}