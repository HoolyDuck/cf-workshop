import { createRoom } from "./routes/rooms";
import { forwardToRoom } from "./routes/websocket";
import { json } from "./utils/response";

export { QuizRoom } from "./durable-objects/QuizRoom";

const ROOM_WS_PATH = /^\/api\/rooms\/([A-Za-z0-9]{4})\/ws$/;

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		if (
			url.pathname === "/api/health" &&
			request.method === "GET"
		) {
			return json({ status: "ok" });
		}

		if (
			url.pathname === "/api/rooms" &&
			request.method === "POST"
		) {
			return createRoom(env);
		}

		const roomMatch = url.pathname.match(ROOM_WS_PATH);
		if (roomMatch) {
			return forwardToRoom(request, env, roomMatch[1]);
		}

		return json(
			{ error: "Not found" },
			{ status: 404 },
		);
	},
} satisfies ExportedHandler<Env>;
