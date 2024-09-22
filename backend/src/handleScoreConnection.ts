import { Env } from '../worker-configuration';

export async function handleScoreConnection(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const upgradeHeader = request.headers.get('Upgrade');

	if (!upgradeHeader || upgradeHeader !== 'websocket') {
		return new Response('Expected Upgrade: websocket', { status: 426 });
	}

	let id = env.WEBSOCKET_COUNT_SERVER.idFromName('count');
	let stub = env.WEBSOCKET_COUNT_SERVER.get(id);

	return stub.fetch(request);
}
