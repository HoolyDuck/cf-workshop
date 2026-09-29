import { DurableObject } from "cloudflare:workers";

import type { Quiz, QuizQuestion } from "../types/quiz";
import type {
	ClientMessage,
	LeaderboardEntry,
	Player,
	PublicQuestion,
	RoomStatus,
	ServerMessage,
} from "../types/messages";
import { logEvent } from "../utils/log";

const BASE_POINTS = 1000;
const SPEED_BONUS_MAX = 500;
const SPEED_BONUS_WINDOW_MS = 10_000;

type PlayerRow = { id: string; name: string; score: number };
type AnswerRow = {
	player_id: string;
	question_position: number;
	option_index: number;
	answered_at: number;
};
type RoomRow = {
	code: string;
	status: RoomStatus;
	current_question: number;
	question_started_at: number | null;
};

// Stored per-connection via ws.serializeAttachment() so it survives hibernation.
type ConnectionAttachment =
	| { role: "host" }
	| { role: "player"; playerId: string };

export class QuizRoom extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		ctx.blockConcurrencyWhile(async () => {
			this.ctx.storage.sql.exec(`
				CREATE TABLE IF NOT EXISTS room (
					id INTEGER PRIMARY KEY CHECK (id = 1),
					code TEXT NOT NULL,
					status TEXT NOT NULL DEFAULT 'lobby',
					current_question INTEGER NOT NULL DEFAULT 0,
					question_started_at INTEGER
				);

				CREATE TABLE IF NOT EXISTS players (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					score INTEGER NOT NULL DEFAULT 0
				);

				CREATE TABLE IF NOT EXISTS answers (
					player_id TEXT NOT NULL,
					question_position INTEGER NOT NULL,
					option_index INTEGER NOT NULL,
					answered_at INTEGER NOT NULL,
					PRIMARY KEY (player_id, question_position)
				);
			`);
		});
	}

	// RPC — called once by the Worker right after it creates the room.
	async init(code: string, quiz: Quiz): Promise<void> {
		this.ctx.storage.sql.exec(
			"INSERT OR IGNORE INTO room (id, code, status) VALUES (1, ?, 'lobby')",
			code,
		);
		await this.ctx.storage.put("quiz", quiz);
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const role = url.searchParams.get("role") === "host" ? "host" : "player";

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		this.ctx.acceptWebSocket(server, [role]);

		const attachment: ConnectionAttachment =
			role === "host"
				? { role: "host" }
				: { role: "player", playerId: crypto.randomUUID() };
		server.serializeAttachment(attachment);

		this.sendTo(server, {
			type: "room_state",
			...(await this.roomStateMessage()),
		});

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(
		ws: WebSocket,
		raw: string | ArrayBuffer,
	): Promise<void> {
		if (typeof raw !== "string") {
			return;
		}

		const attachment = ws.deserializeAttachment() as ConnectionAttachment | null;
		if (!attachment) {
			return;
		}

		let message: ClientMessage;
		try {
			message = JSON.parse(raw);
		} catch {
			this.sendTo(ws, { type: "error", message: "Invalid message" });
			return;
		}

		try {
			switch (message.type) {
				case "join":
					await this.handleJoin(ws, attachment, message.name);
					break;
				case "start_quiz":
					await this.handleStartQuiz(attachment);
					break;
				case "submit_answer":
					await this.handleSubmitAnswer(attachment, message.optionIndex);
					break;
				case "show_answer":
					await this.handleShowAnswer(attachment);
					break;
				case "next_question":
					await this.handleNextQuestion(attachment);
					break;
			}
		} catch (error) {
			logEvent("quiz_room_error", { error: String(error), messageType: message.type });
			this.sendTo(ws, { type: "error", message: "Something went wrong" });
		}
	}

	async webSocketClose(): Promise<void> {
		// Hibernation drops the socket itself; players/scores stay in storage.
		// "connected" is derived live from ctx.getWebSockets(), never persisted.
		await this.broadcastRoomState();
	}

	// ---- message handlers ----

	private async handleJoin(
		ws: WebSocket,
		attachment: ConnectionAttachment,
		name: string,
	): Promise<void> {
		if (attachment.role !== "player") {
			return;
		}

		const trimmedName = name.trim().slice(0, 24);
		if (!trimmedName) {
			this.sendTo(ws, { type: "error", message: "Name is required" });
			return;
		}

		this.ctx.storage.sql.exec(
			"INSERT INTO players (id, name, score) VALUES (?, ?, 0)",
			attachment.playerId,
			trimmedName,
		);

		this.broadcast({
			type: "player_joined",
			player: { id: attachment.playerId, name: trimmedName, score: 0, connected: true },
		});
		await this.broadcastRoomState();
	}

	private async handleStartQuiz(attachment: ConnectionAttachment): Promise<void> {
		if (attachment.role !== "host") {
			return;
		}

		const room = this.getRoom();
		const quiz = await this.getQuiz();
		if (room.status !== "lobby" || !quiz || quiz.questions.length === 0) {
			return;
		}

		this.ctx.storage.sql.exec(
			"UPDATE room SET status = 'playing', current_question = 0, question_started_at = ? WHERE id = 1",
			Date.now(),
		);

		this.broadcast({ type: "quiz_started" });
		this.broadcast({
			type: "question_started",
			question: this.publicQuestion(quiz.questions[0], quiz.questions.length),
		});
	}

	private async handleSubmitAnswer(
		attachment: ConnectionAttachment,
		optionIndex: number,
	): Promise<void> {
		if (attachment.role !== "player") {
			return;
		}

		const room = this.getRoom();
		if (room.status !== "playing") {
			return;
		}

		this.ctx.storage.sql.exec(
			"INSERT OR IGNORE INTO answers (player_id, question_position, option_index, answered_at) VALUES (?, ?, ?, ?)",
			attachment.playerId,
			room.current_question,
			optionIndex,
			Date.now(),
		);

		this.broadcast(this.answerProgress(room.current_question));
	}

	private async handleShowAnswer(attachment: ConnectionAttachment): Promise<void> {
		if (attachment.role !== "host") {
			return;
		}

		const room = this.getRoom();
		const quiz = await this.getQuiz();
		const question = quiz?.questions[room.current_question];
		if (room.status !== "playing" || !question) {
			return;
		}

		const startedAt = room.question_started_at ?? Date.now();

		const answers = this.ctx.storage.sql
			.exec<AnswerRow>(
				"SELECT * FROM answers WHERE question_position = ?",
				room.current_question,
			)
			.toArray();

		for (const answer of answers) {
			if (answer.option_index !== question.correctOption) {
				continue;
			}

			const elapsed = Math.max(0, answer.answered_at - startedAt);
			const speedBonus = Math.round(
				SPEED_BONUS_MAX * Math.max(0, 1 - elapsed / SPEED_BONUS_WINDOW_MS),
			);

			this.ctx.storage.sql.exec(
				"UPDATE players SET score = score + ? WHERE id = ?",
				BASE_POINTS + speedBonus,
				answer.player_id,
			);
		}

		this.ctx.storage.sql.exec("UPDATE room SET status = 'revealed' WHERE id = 1");

		this.broadcast({
			type: "question_finished",
			correctOption: question.correctOption,
			leaderboard: this.leaderboard(),
		});
	}

	private async handleNextQuestion(attachment: ConnectionAttachment): Promise<void> {
		if (attachment.role !== "host") {
			return;
		}

		const room = this.getRoom();
		const quiz = await this.getQuiz();
		if (room.status !== "revealed" || !quiz) {
			return;
		}

		const nextIndex = room.current_question + 1;

		if (nextIndex >= quiz.questions.length) {
			this.ctx.storage.sql.exec("UPDATE room SET status = 'finished' WHERE id = 1");
			this.broadcast({ type: "quiz_finished", leaderboard: this.leaderboard() });
			return;
		}

		this.ctx.storage.sql.exec(
			"UPDATE room SET status = 'playing', current_question = ?, question_started_at = ? WHERE id = 1",
			nextIndex,
			Date.now(),
		);

		this.broadcast({
			type: "question_started",
			question: this.publicQuestion(quiz.questions[nextIndex], quiz.questions.length),
		});
	}

	// ---- helpers ----

	private getRoom(): RoomRow {
		return this.ctx.storage.sql
			.exec<RoomRow>(
				"SELECT code, status, current_question, question_started_at FROM room WHERE id = 1",
			)
			.one();
	}

	private async getQuiz(): Promise<Quiz | undefined> {
		return this.ctx.storage.get<Quiz>("quiz");
	}

	private publicQuestion(question: QuizQuestion, total: number): PublicQuestion {
		return {
			id: question.id,
			position: question.position,
			total,
			text: question.text,
			options: question.options.map((option) => option.text),
		};
	}

	private answerProgress(questionPosition: number): Extract<ServerMessage, { type: "answer_progress" }> {
		const answered = this.ctx.storage.sql
			.exec<{ count: number }>(
				"SELECT COUNT(*) as count FROM answers WHERE question_position = ?",
				questionPosition,
			)
			.one().count;
		const total = this.ctx.storage.sql
			.exec<{ count: number }>("SELECT COUNT(*) as count FROM players")
			.one().count;

		return { type: "answer_progress", answered, total };
	}

	private leaderboard(): LeaderboardEntry[] {
		return this.ctx.storage.sql
			.exec<PlayerRow>("SELECT id, name, score FROM players ORDER BY score DESC")
			.toArray();
	}

	private connectedPlayerIds(): Set<string> {
		const ids = new Set<string>();
		for (const ws of this.ctx.getWebSockets("player")) {
			const attachment = ws.deserializeAttachment() as ConnectionAttachment | null;
			if (attachment?.role === "player") {
				ids.add(attachment.playerId);
			}
		}
		return ids;
	}

	private async roomStateMessage(): Promise<
		Omit<Extract<ServerMessage, { type: "room_state" }>, "type">
	> {
		const room = this.getRoom();
		const quiz = await this.getQuiz();
		const connected = this.connectedPlayerIds();

		const players: Player[] = this.ctx.storage.sql
			.exec<PlayerRow>("SELECT id, name, score FROM players ORDER BY score DESC")
			.toArray()
			.map((player) => ({ ...player, connected: connected.has(player.id) }));

		const question =
			room.status === "playing" && quiz
				? this.publicQuestion(quiz.questions[room.current_question], quiz.questions.length)
				: undefined;

		return { code: room.code, status: room.status, players, question };
	}

	private async broadcastRoomState(): Promise<void> {
		this.broadcast({ type: "room_state", ...(await this.roomStateMessage()) });
	}

	private sendTo(ws: WebSocket, message: ServerMessage): void {
		ws.send(JSON.stringify(message));
	}

	private broadcast(message: ServerMessage): void {
		const payload = JSON.stringify(message);
		for (const ws of this.ctx.getWebSockets()) {
			ws.send(payload);
		}
	}
}
