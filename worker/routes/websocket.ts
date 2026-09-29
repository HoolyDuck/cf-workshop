// The Worker never terminates the socket itself — it just resolves which
// QuizRoom owns this code and hands the upgrade request to it.
export function forwardToRoom(
	request: Request,
	env: Env,
	code: string,
): Promise<Response> {
	const stub = env.QUIZ_ROOM.getByName(code.toUpperCase());
	return stub.fetch(request);
}
