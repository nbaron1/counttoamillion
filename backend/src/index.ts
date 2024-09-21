import { handleCount } from './score';
import { Router } from '@tsndr/cloudflare-worker-router';
import { WebSocketCountServer } from './WebSocketCountServer';

const router = new Router();

router.get('/health', async ({}) => {
	return new Response('OK', { status: 200 });
});

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const path = new URL(request.url).pathname;

		if (path === '/score') {
			return handleCount(request, env, ctx);
		}

		return router.handle(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;

export { WebSocketCountServer };
