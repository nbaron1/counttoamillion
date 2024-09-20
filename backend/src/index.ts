/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { handleCount } from './count';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const { pathname } = new URL(request.url);

		switch (pathname) {
			case '/count': {
				return handleCount(request, env, ctx);
			}
			case '/health': {
				return new Response('OK', { status: 200 });
			}
		}

		return new Response(null, {
			status: 404,
		});
	},
} satisfies ExportedHandler<Env>;
