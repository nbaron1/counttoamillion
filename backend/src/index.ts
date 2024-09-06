import { DurableObject } from 'cloudflare:workers';

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

/**
 * Associate bindings declared in wrangler.toml with the TypeScript type system
 */
export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	WEBSOCKET_SERVER: DurableObjectNamespace<WebSocketServer>;

	DB: D1Database;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

/** A Durable Object's behavior is defined in an exported Javascript class */
export class WebSocketServer extends DurableObject<Env> {
	// private sessions: Map<string, WebSocket>;
	private connections: WebSocket[] = [];

	async getCounterValue() {
		const value: number = (await this.ctx.storage.get('value')) || 0;
		return value;
	}

	async getHighScore() {
		const highScore: number = (await this.ctx.storage.get('highScore')) || 0;
		return highScore;
	}

	async setHighScore(value: number) {
		console.log('Setting high score to', value);
		await this.ctx.storage.put('highScore', value);
	}

	async setCounterValue(value: number) {
		console.log('Setting value to', value);
		await this.ctx.storage.put('value', value);
	}

	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.toml
	 */
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async fetch(request: Request): Promise<Response> {
		// const result = await query.first();
		// console.log({ result });

		// Creates two ends of a WebSocket connection.
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		this.connections.push(server);
		server.accept();

		// Upon receiving a message from the client, the server replies with the same message,
		// and the total number of connections with the "[Durable Object]: " prefix
		server.addEventListener('message', async (event) => {
			try {
				console.log('Num of connections', this.connections.length);

				const parsedData = JSON.parse(event.data as string);
				console.log(event.data);

				switch (parsedData.type) {
					case 'initial': {
						const value = await this.getCounterValue();
						const highScore = await this.getHighScore();

						try {
							server.send(JSON.stringify({ value, type: 'initial', highScore }));
						} catch (error) {
							console.error('Error sending message to client', error);
						}

						return;
					}
					case 'update-count': {
						const currentCount = await this.getCounterValue();

						if (currentCount + 1 !== parsedData.value) {
							await this.setCounterValue(1);

							const query = this.env.DB.prepare('INSERT INTO attempt (max_count) VALUES (?)').bind(currentCount);
							await query.run();

							this.connections.forEach((connection) => {
								try {
									connection.send(JSON.stringify({ type: 'failed', value: parsedData.value }));
								} catch (error) {
									console.error('Error sending message to client', error);
								}
							});

							return;
						}

						await this.setCounterValue(parsedData.value);

						this.connections.forEach((connection) => {
							try {
								connection.send(JSON.stringify({ value: parsedData.value, type: 'count-updated' }));
							} catch (error) {
								console.error('Error sending message to client', error);
							}
						});

						const highScore = await this.getHighScore();

						if (parsedData.value > highScore) {
							await this.setHighScore(parsedData.value);
						}

						return;
					}
				}
			} catch (error) {
				console.error(error);
			}
		});

		// If the client closes the connection, the runtime will close the connection too.
		server.addEventListener('close', (cls) => {
			this.connections = this.connections.filter((connection) => connection !== server);
			server.close(cls.code, 'Durable Object is closing WebSocket');
		});

		server.addEventListener('error', (error) => {
			this.connections = this.connections.filter((connection) => connection !== server);
			console.error('WebSocket error', error);
		});

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}
}

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.toml
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request, env, ctx): Promise<Response> {
		console.log(new URL(request.url).pathname);

		const pathName = new URL(request.url).pathname;

		console.log('Pathname', pathName);

		switch (pathName) {
			case '/v1/websocket': {
				const upgradeHeader = request.headers.get('Upgrade');

				if (!upgradeHeader || upgradeHeader !== 'websocket') {
					return new Response('Durable Object expected Upgrade: websocket', { status: 426 });
				}

				let id = env.WEBSOCKET_SERVER.idFromName('main');
				let stub = env.WEBSOCKET_SERVER.get(id);

				return stub.fetch(request);
			}
			case '/v1/attempts': {
				console.log({ method: request.method });

				const responseHeaders = new Headers();
				// tood: change allowed based on dev / prod mode
				responseHeaders.set('Access-Control-Allow-Origin', '*');

				if (request.method !== 'GET') {
					return new Response('Method not allowed', { status: 405 });
				}

				// todo: add pagination
				const query = env.DB.prepare('SELECT * FROM attempt limit 10');
				const attempts = await query.all();

				if (!attempts.success) {
					return new Response('Failed to get attempts', { status: 500, headers: responseHeaders });
				}

				return new Response(JSON.stringify(attempts.results), { status: 200, headers: responseHeaders });
			}
			default: {
				return new Response('Not Found', { status: 404 });
			}
		}
	},
} satisfies ExportedHandler<Env>;
