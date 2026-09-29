import { createExecutionContext, waitOnExecutionContext, env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../worker/index";
import type { ServerMessage } from "../worker/types/messages";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

async function createRoom(): Promise<string> {
	const response = await SELF.fetch("https://example.com/api/rooms", { method: "POST" });
	const { code } = await response.json<{ code: string }>();
	return code;
}

type Connection = {
	send: (message: unknown) => void;
	next: () => Promise<ServerMessage>;
	waitFor: <T extends ServerMessage["type"]>(
		type: T,
	) => Promise<Extract<ServerMessage, { type: T }>>;
};

async function connect(code: string, query = ""): Promise<Connection> {
	const response = await SELF.fetch(`https://example.com/api/rooms/${code}/ws${query}`, {
		headers: { Upgrade: "websocket" },
	});

	const socket = response.webSocket;
	if (!socket) {
		throw new Error("Expected a WebSocket response");
	}
	socket.accept();

	const queue: ServerMessage[] = [];
	const waiters: ((message: ServerMessage) => void)[] = [];

	socket.addEventListener("message", (event: MessageEvent) => {
		const message = JSON.parse(event.data as string) as ServerMessage;
		const waiter = waiters.shift();
		if (waiter) {
			waiter(message);
		} else {
			queue.push(message);
		}
	});

	const next = (): Promise<ServerMessage> =>
		new Promise((resolve) => {
			const message = queue.shift();
			if (message) {
				resolve(message);
			} else {
				waiters.push(resolve);
			}
		});

	return {
		send: (message: unknown) => socket.send(JSON.stringify(message)),
		next,
		waitFor: async (type) => {
			for (let i = 0; i < 20; i++) {
				const message = await next();
				if (message.type === type) {
					return message as never;
				}
			}
			throw new Error(`Timed out waiting for message type "${type}"`);
		},
	};
}

describe("quiz worker", () => {
	it("returns ok for GET /api/health", async () => {
		const request = new IncomingRequest("https://example.com/api/health");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	it("returns 404 for unknown routes", async () => {
		const request = new IncomingRequest("https://example.com/nope");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it("creates a room with a 4-character code", async () => {
		const response = await SELF.fetch("https://example.com/api/rooms", { method: "POST" });
		expect(response.status).toBe(201);
		const { code } = await response.json<{ code: string }>();
		expect(code).toMatch(/^[A-Z0-9]{4}$/);
	});
});

describe("quiz room realtime flow", () => {
	it("takes a host and a player from join through the final leaderboard", async () => {
		const code = await createRoom();

		const host = await connect(code, "?role=host");
		const initialRoomState = await host.waitFor("room_state");
		expect(initialRoomState.status).toBe("lobby");
		expect(initialRoomState.players).toEqual([]);

		const player = await connect(code);
		await player.waitFor("room_state");

		player.send({ type: "join", name: "Alex" });
		const joined = await host.waitFor("player_joined");
		expect(joined.player.name).toBe("Alex");

		host.send({ type: "start_quiz" });
		await host.waitFor("quiz_started");
		const hostQuestion = await host.waitFor("question_started");
		expect(hostQuestion.question.text).toBeTruthy();
		expect(hostQuestion.question).not.toHaveProperty("correctOption");

		await player.waitFor("quiz_started");
		const playerQuestion = await player.waitFor("question_started");
		expect(playerQuestion.question).not.toHaveProperty("correctOption");

		// The seeded quiz's first question ("serverless SQL") is correct at index 1 (D1).
		player.send({ type: "submit_answer", optionIndex: 1 });
		const progress = await host.waitFor("answer_progress");
		expect(progress).toEqual({ type: "answer_progress", answered: 1, total: 1 });

		host.send({ type: "show_answer" });
		const revealed = await host.waitFor("question_finished");
		expect(revealed.correctOption).toBe(1);
		expect(revealed.leaderboard).toEqual([{ id: expect.any(String), name: "Alex", score: expect.any(Number) }]);
		expect(revealed.leaderboard[0].score).toBeGreaterThan(0);

		// Walk through the remaining 4 questions without answering, to reach the end.
		for (let position = 1; position < 5; position++) {
			host.send({ type: "next_question" });
			const started = await host.waitFor("question_started");
			expect(started.question.position).toBe(position);

			host.send({ type: "show_answer" });
			await host.waitFor("question_finished");
		}

		host.send({ type: "next_question" });
		const finished = await host.waitFor("quiz_finished");
		expect(finished.leaderboard[0].name).toBe("Alex");
	});
});
