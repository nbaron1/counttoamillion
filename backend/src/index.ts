import { handleScoreConnection } from './handleScoreConnection';
import { Router } from '@tsndr/cloudflare-worker-router';
import { WebSocketCountServer } from './WebSocketCountServer';
import { WebSocketRankServer } from './WebSocketRankServer';
import { handleRankConnection } from './handleRankConnection';
import { Env } from '../worker-configuration';

const router = new Router();

router.get('/health', async ({}) => {
	return new Response('OK', { status: 200 });
});

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const path = new URL(request.url).pathname;

		switch (path) {
			case '/score': {
				return handleScoreConnection(request, env, ctx);
			}

			case '/rank': {
				console.log('rank');
				return handleRankConnection(request, env, ctx);
			}
		}

		return router.handle(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;

export { WebSocketCountServer, WebSocketRankServer };
