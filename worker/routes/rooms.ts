import { getQuiz } from "../db/quizzes";
import { json } from "../utils/response";
import { logEvent } from "../utils/log";

// Excludes easily-confused characters (0/O, 1/I) for a code read off a projector.
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 4;
const QUIZ_ID = 1;

function generateRoomCode(): string {
	let code = "";
	for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
		code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
	}
	return code;
}

export async function createRoom(env: Env): Promise<Response> {
	const quiz = await getQuiz(env.DB, QUIZ_ID);

	if (!quiz) {
		return json({ error: "Quiz not found" }, { status: 500 });
	}

	const code = generateRoomCode();
	const stub = env.QUIZ_ROOM.getByName(code);
	await stub.init(code, quiz);

	logEvent("room_created", { code });

	return json({ code }, { status: 201 });
}
