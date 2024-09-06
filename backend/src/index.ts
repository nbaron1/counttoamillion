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
export class WebSocketServer extends DurableObject {
	// private sessions: Map<string, WebSocket>;
	private connections: WebSocket[] = [];

	async getCounterValue() {
		const value: number = (await this.ctx.storage.get('value')) || 0;
		return value;
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
						server.send(JSON.stringify({ value, type: 'count-updated' }));

						return;
					}
					case 'update-count': {
						const currentCount = await this.getCounterValue();

						if (currentCount + 1 !== parsedData.value) {
							await this.setCounterValue(1);

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

						const updatedCount = await this.getCounterValue();

						this.connections.forEach((connection) => {
							try {
								connection.send(JSON.stringify({ value: updatedCount, type: 'count-updated' }));
							} catch (error) {
								console.error('Error sending message to client', error);
							}
						});

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
		if (request.url.endsWith('/websocket')) {
			const upgradeHeader = request.headers.get('Upgrade');

			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				return new Response('Durable Object expected Upgrade: websocket', { status: 426 });
			}

			let id = env.WEBSOCKET_SERVER.idFromName('main');
			let stub = env.WEBSOCKET_SERVER.get(id);

			return stub.fetch(request);

			// We will create a `DurableObjectId` using the pathname from the Worker request
			// This id refers to a unique instance of our 'MyDurableObject' class above
			// let id: DurableObjectId = env.WEBSOCKET_SERVER.idFromName(new URL(request.url).pathname);

			// // This stub creates a communication channel with the Durable Object instance
			// // The Durable Object constructor will be invoked upon the first call for a given id
			// let stub = env.WEBSOCKET_SERVER.get(id);

			// // We call the `sayHello()` RPC method on the stub to invoke the method on the remote
			// // Durable Object instance
			// let greeting = await stub.sayHello('world');

			// return new Response(greeting);
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
