import { DurableObject } from 'cloudflare:workers';
import { Env } from '../worker-configuration';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import postgres from 'postgres';

export class WebSocketRankServer extends DurableObject<Env> {
	supabase: SupabaseClient<Database>;
	sql: postgres.Sql;
	sessions: Map<WebSocket, string> = new Map();

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
		this.sql = postgres(this.env.DATABASE_URL);
	}

	private async getUserRank(userId: string) {
		const [userRank] = await this.sql`
		with ranked_users as (
			select 
				id, 
				high_score,
				dense_rank() over (order by high_score desc) as rank
			from app_user
		)
		select * 
		from ranked_users
		where id = ${userId}`;

		return Number(userRank.rank);
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
		this.sessions.set(server, userId);

		const rank = await this.getUserRank(userId);

		server.send(
			JSON.stringify({
				type: 'rank',
				value: rank,
			})
		);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
		const data = JSON.parse(message.toString());
		console.log('ws rank data', data);

		const userId = this.sessions.get(ws);

		if (!userId) {
			ws.close(1008, 'Unauthorized');
			return;
		}

		if (data.type !== 'rank') return;

		const rank = await this.getUserRank(userId);

		ws.send(
			JSON.stringify({
				type: 'rank',
				value: rank,
			})
		);
	}
}
